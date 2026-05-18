import { defineConfig } from '@vben/vite-config';

import { loadEnv } from 'vite';

function createManualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const normalizedId = id.replaceAll('\\', '/');

  if (normalizedId.includes('/wujie') || normalizedId.includes('/wujie-vue3')) {
    return 'vendor-wujie';
  }

  if (normalizedId.includes('/vxe-') || normalizedId.includes('/xe-utils/')) {
    return 'vendor-vxe';
  }

  if (normalizedId.includes('/@visactor/')) {
    return 'vendor-visactor';
  }

  if (normalizedId.includes('/@antv/') || normalizedId.includes('/dagre/')) {
    return 'vendor-antv';
  }

  if (
    normalizedId.includes('/three/') ||
    normalizedId.includes('/leaflet') ||
    normalizedId.includes('/proj4/')
  ) {
    return 'vendor-geo-3d';
  }

  if (normalizedId.includes('/@iconify/')) {
    return 'vendor-iconify';
  }

  if (
    normalizedId.includes('/ant-design-vue/') ||
    normalizedId.includes('/@ant-design/')
  ) {
    return 'vendor-antdv';
  }

  if (
    normalizedId.includes('/vue/') ||
    normalizedId.includes('/@vue/') ||
    normalizedId.includes('/vue-router/') ||
    normalizedId.includes('/pinia/')
  ) {
    return 'vendor-vue';
  }

  return undefined;
}

export default defineConfig(async (config) => {
  const mode = config?.mode ?? 'development';
  // 第三个参数为空表示读取 env的所有环境变量，不使用前缀做过滤
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;
  const proxyTargetEnergy = env.VITE_DEV_PROXY_TARGET_ENERGY;
  const proxyTargetAiAssistant = env.VITE_DEV_PROXY_TARGET_AI_ASSISTANT;
  const VITE_DEV_PROXY_WEATHER = env.VITE_DEV_PROXY_WEATHER;
  return {
    application: {
      // 登录之前的loading页
      injectAppLoading: false,
    },
    vite: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: createManualChunks,
          },
        },
      },
      server: {
        proxy: {
          '/ai-assistant': {
            changeOrigin: true,
            headers: {
              referer: proxyTargetAiAssistant,
            },
            // rewrite: (path) => path.replace(/^\/api\/chat/, ''),
            // mock代理目标地址
            target: proxyTargetAiAssistant,
            ws: true,
          },
          '/api/kdp-predict-service': {
            target: VITE_DEV_PROXY_WEATHER,
            rewrite: (path) => path.replace(/^\/api\/kdp-predict-service/, ''),
          },
          // 研发环境
          '/api': {
            changeOrigin: true,
            headers: {
              referer: proxyTarget,
            },
            // mock代理目标地址
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
          // 能源测研发环境
          '/api/iep-res-entity-service': {
            changeOrigin: true,
            headers: {
              referer: proxyTargetEnergy,
            },
            // rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
            rewrite: (path) =>
              path.replace(/^\/api\/iep-res-entity-service/, ''),
            // mock代理目标地址
            target: proxyTargetEnergy,
            ws: true,
          },
        },
      },
    },
  };
});
