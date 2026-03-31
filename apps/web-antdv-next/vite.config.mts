import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      // 登录之前的loading页
      injectAppLoading: false,
    },
    vite: {
      server: {
        proxy: {
          // 研发环境
          // '/api': {
          //   changeOrigin: true,
          //   headers: {
          //     referer: 'http://100.153.1.74:30110',
          //   },
          //   // rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
          //   rewrite: (path) => path.replace(/^\/api/, ''),
          //   // mock代理目标地址
          //   target: 'http://100.153.1.74:30110',
          //   ws: true,
          // },
          // 测试环境
          '/api': {
            changeOrigin: true,
            headers: {
              referer: 'http://100.153.4.166:30100',
            },
            // rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
            // rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://100.153.4.166:30100',
            ws: true,
          },
          // qyj
          // '/api': {
          //   changeOrigin: true,
          //   headers: {
          //     referer: 'http://192.168.0.35:8010',
          //   },
          //   // rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
          //   rewrite: (path) => path.replace(/^\/api/, ''),
          //   // mock代理目标地址
          //   target: 'http://192.168.0.35:8010',
          //   ws: true,
          // },
        },
      },
    },
  };
});
