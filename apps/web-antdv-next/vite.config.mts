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
          '/api/official-website': {
            changeOrigin: true,
            headers: {
              referer: 'http://100.153.1.74:30201',
            },
            rewrite: (path) => path.replace(/^\/api\/official-website/, ''),
            // mock代理目标地址
            target: 'http://100.153.1.74:30201',
            ws: true
          },
          '/api/asset': {
            changeOrigin: true,
            headers: {
              referer: 'http://100.153.1.74:30122',
            },
            rewrite: (path) => path.replace(/^\/api\/asset/, ''),
            // mock代理目标地址
            target: 'http://100.153.1.74:30122',
            ws: true
          },
          '/api': {
            changeOrigin: true,
            headers: {
              referer: 'http://100.153.1.74:30111',
            },
            rewrite: (path) => path.replace(/^\/api\/de-base-system/, ''),
            // mock代理目标地址
            target: 'http://100.153.1.74:30111',
            ws: true
          },

        },
      },
    },
  };
});
