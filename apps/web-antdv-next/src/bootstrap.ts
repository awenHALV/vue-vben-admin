import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antdv-next';

import { useTitle } from '@vueuse/core';
// 注册微前端
import WujieVue from 'wujie-vue3';

import { $t, $te, i18n, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';
import { setupWujieHostBridge } from './wujie-config/hostBridge';
import setupWujieApp from './wujie-config/setupApp';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  app.use(WujieVue);
  setupWujieApp();

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 无界：子应用通过 bus 拉取 token / 明暗 / 内置主题，并在变更时推送
  setupWujieHostBridge();

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题（应用名走 i18n：preferences.app.name 为 key，如 app.title）
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      i18n.global.locale.value;
      const routeTitle = router.currentRoute.value.meta?.title;
      const appName = $te(preferences.app.name)
        ? $t(preferences.app.name)
        : preferences.app.name;
      const pageTitle =
        (routeTitle ? `${$t(String(routeTitle))} - ` : '') + appName;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
