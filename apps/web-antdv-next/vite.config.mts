import { defineConfig } from '@vben/vite-config';

import { loadEnv } from 'vite';

export default defineConfig(async (config) => {
  // 第三个参数为空表示读取 env的所有环境变量，不使用前缀做过滤
  const env = loadEnv(config.mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;
  const proxyTargetEnergy = env.VITE_DEV_PROXY_TARGET_ENERGY;
  return {
    application: {
      // 登录之前的loading页
      injectAppLoading: false,
    },
    vite: {
      server: {
        proxy: {
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
