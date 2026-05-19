import { defineConfig } from '@vben/vite-config';
import { loadEnv, type Plugin } from 'vite';

const piniaImportMapUrl = 'https://iep.inspur.com/vueresources/vue-cdn/pinia.esm.js';
const vueCdnUrl =
  'https://iep.inspur.com/vueresources/vue-cdn/vue.esm-browser.prod.js';
const vueRouterCdnUrl =
  'https://iep.inspur.com/vueresources/vue-cdn/vue-router.esm-browser.prod.js';
const esModuleShimsUrl =
  'https://iep.inspur.com/vueresources/vue-cdn/es-module-shims.js';

const exactImportMap = {
  pinia: piniaImportMapUrl,
  vue: vueCdnUrl,
  'vue-router': vueRouterCdnUrl,
};

function createExactImportMapPlugin(imports: Record<string, string>): Plugin {
  return {
    apply: 'build',
    enforce: 'post',
    name: 'exact-importmap',
    transformIndexHtml(html) {
      const moduleScriptPattern =
        /<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i;
      const entryMatch = html.match(moduleScriptPattern);

      if (!entryMatch?.[1]) {
        return html;
      }

      const entrySrc = JSON.stringify(entryMatch[1]);
      const importMapScript = `<script type="importmap">${JSON.stringify({ imports })}</script>`;
      const bootstrapScript = `<script>
if (!HTMLScriptElement.supports || !HTMLScriptElement.supports('importmap')) {
  self.importShim = function () {
    const promise = new Promise((resolve, reject) => {
      document.head.appendChild(
        Object.assign(document.createElement('script'), {
          src: '${esModuleShimsUrl}',
          crossorigin: 'anonymous',
          async: true,
          onload() {
            if (!importShim.$proxy) {
              resolve(importShim);
            } else {
              reject(new Error('No globalThis.importShim found:${esModuleShimsUrl}'));
            }
          },
          onerror(error) {
            reject(error);
          },
        }),
      );
    });
    importShim.$proxy = true;
    return promise.then((importShim) => importShim(...arguments));
  };
}

var modules = [${entrySrc}];
typeof importShim === 'function'
  ? modules.forEach((moduleName) => importShim(moduleName))
  : modules.forEach((moduleName) => import(moduleName));
</script>`;

      return html
        .replace(/<head>/i, `<head>${importMapScript}`)
        .replace(moduleScriptPattern, bootstrapScript);
    },
  };
}

function getPackageNameFromId(id: string) {
  const normalizedId = id.replaceAll('\\', '/');
  const nodeModulesMarker = '/node_modules/';
  const nodeModulesIndex = normalizedId.lastIndexOf(nodeModulesMarker);

  if (nodeModulesIndex === -1) {
    return undefined;
  }

  const packagePath = normalizedId.slice(
    nodeModulesIndex + nodeModulesMarker.length,
  );
  const segments = packagePath.split('/');

  if (segments[0] === '.pnpm') {
    const nestedNodeModulesIndex = segments.indexOf('node_modules');
    if (nestedNodeModulesIndex === -1) {
      return undefined;
    }

    const packageNameIndex = nestedNodeModulesIndex + 1;
    if (segments[packageNameIndex]?.startsWith('@')) {
      return `${segments[packageNameIndex]}/${segments[packageNameIndex + 1]}`;
    }

    return segments[packageNameIndex];
  }

  if (segments[0]?.startsWith('@')) {
    return `${segments[0]}/${segments[1]}`;
  }

  return segments[0];
}

function createManualChunks(id: string) {
  const packageName = getPackageNameFromId(id);

  if (!packageName) {
    return undefined;
  }

  if (packageName === 'wujie' || packageName === 'wujie-vue3') {
    return 'vendor-wujie';
  }

  if (packageName.startsWith('vxe-') || packageName === 'xe-utils') {
    return 'vendor-vxe';
  }

  if (packageName.startsWith('@visactor/')) {
    return 'vendor-visactor';
  }

  if (packageName.startsWith('@antv/') || packageName === 'dagre') {
    return 'vendor-antv';
  }

  if (
    packageName === 'three' ||
    packageName === 'leaflet' ||
    packageName === 'proj4'
  ) {
    return 'vendor-geo-3d';
  }

  if (packageName.startsWith('@iconify/')) {
    return 'vendor-iconify';
  }

  if (
    packageName === 'ant-design-vue' ||
    packageName.startsWith('@ant-design/')
  ) {
    return 'vendor-antdv';
  }

  return undefined;
}

export default defineConfig(async (config) => {
  const mode = config?.mode ?? 'development';
  const env = loadEnv(mode, process.cwd(), '');
  const VITE_DEV_PROXY_WEATHER = env.VITE_DEV_PROXY_WEATHER;
  const developmentEnv =
    mode === 'development' ? env : loadEnv('development', process.cwd(), '');
  const proxyTarget =
    env.VITE_DEV_PROXY_TARGET || developmentEnv.VITE_DEV_PROXY_TARGET;
  const proxyTargetEnergy =
    env.VITE_DEV_PROXY_TARGET_ENERGY ||
    developmentEnv.VITE_DEV_PROXY_TARGET_ENERGY;
  const proxyTargetAiAssistant =
    env.VITE_DEV_PROXY_TARGET_AI_ASSISTANT ||
    developmentEnv.VITE_DEV_PROXY_TARGET_AI_ASSISTANT;
  const proxy = {
    '/ai-assistant': {
      changeOrigin: true,
      headers: {
        referer: proxyTargetAiAssistant,
      },
      target: proxyTargetAiAssistant,
      ws: true,
    },
    '/api/kdp-predict-service': {
      target: VITE_DEV_PROXY_WEATHER,
      rewrite: (path) => path.replace(/^\/api\/kdp-predict-service/, ''),
    },
    '/api': {
      changeOrigin: true,
      headers: {
        referer: proxyTarget,
      },
      target: proxyTarget,
      ws: true,
    },
    // 测试环境
    // '/api': {
    //   changeOrigin: true,
    //   headers: {
    //     referer: 'http://100.153.4.166:30100',
    //   },
    //   // rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
    //   // rewrite: (path) => path.replace(/^\/api/, ''),
    //   // mock代理目标地址
    //   target: 'http://100.153.4.166:30100',
    //   ws: true,
    // },
    '/api/iep-res-entity-service': {
      changeOrigin: true,
      headers: {
        referer: proxyTargetEnergy,
      },
      rewrite: (path: string) =>
        path.replace(/^\/api\/iep-res-entity-service/, ''),
      target: proxyTargetEnergy,
      ws: true,
    },
  };

  return {
    application: {
      injectAppLoading: false,
    },
    vite: {
      build: {
        rollupOptions: {
          external: Object.keys(exactImportMap),
          output: {
            manualChunks: createManualChunks,
          },
        },
      },
      plugins: [
        createExactImportMapPlugin(exactImportMap),
      ],
      preview: {
        proxy,
      },
      server: {
        proxy,
      },
    },
  };
});
