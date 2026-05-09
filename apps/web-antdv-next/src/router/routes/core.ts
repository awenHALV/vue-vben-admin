import type { RouteRecordRaw } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';

import { $t } from '#/locales';
import website from '#/wujie-config/website';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');

/**
 * 与 wujie `website.projectCodes` 一致：这些前缀下「菜单未注册」的路径（含详情动态段）
 * 仍走 `micro/index` 容器，由容器内 `buildMicroUrl` 拼子应用 URL，避免基座 404。
 * 路由在菜单合并后追加到 Root.children 末尾（见 `router/access.ts`）。
 */
const microPrefixNotFoundRoutes: RouteRecordRaw[] = website.projectCodes.map(
  (code) => ({
    name: `MicroNotFound_${code}`,
    path: `/${code}/:pathMatch(.*)*`,
    component: () => import('#/views/micro/index.vue'),
    meta: {
      hideInBreadcrumb: false,
      hideInMenu: true,
      microName: code,
      title: code,
    },
  }),
);
/** 全局404页面 */
const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

/** 基本路由，这些路由是必须存在的 */
const coreRoutes: RouteRecordRaw[] = [
  /**
   * 根路由
   * 使用基础布局，作为所有页面的父级容器，子级就不必配置BasicLayout。
   * 此路由必须存在，且不应修改
   */
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    // 必须指向真实业务子路径；若与 path 同为 `/` 会与自身 redirect 形成死循环（Maximum call stack）
    redirect: preferences.app.defaultHomePath,
    children: [
      {
        name: 'NoMenuPermission',
        path: 'no-menu-permission',
        component: () =>
          import('#/views/_core/fallback/no-menu-permission.vue'),
        meta: {
          headerContentOnly: true,
          hideInBreadcrumb: true,
          hideInMenu: true,
          hideInTab: true,
          title: $t('page.fallback.noMenuPermission'),
        },
      },
      {
        name: 'Profile',
        path: 'profile',
        component: () => import('#/views/_core/profile/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.auth.profile'),
        },
      },
      {
        name: 'DownloadCenter',
        path: 'download-center',
        component: () => import('#/views/_core/download/index.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.downloadCenter.title'),
        },
      },
      {
        name: 'GridChargeGunDetail',
        path: 'grid/equipmentMonitoring/chargeGun/:id',
        component: () => import('#/views/micro/index.vue'),
        meta: {
          hideInBreadcrumb: true,
          hideInMenu: true,
          microName: 'grid',
          title: '充电枪详情',
        },
      },
    ],
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: {
          title: $t('page.auth.login'),
        },
      },
      {
        name: 'CodeLogin',
        path: 'code-login',
        component: () => import('#/views/_core/authentication/code-login.vue'),
        meta: {
          title: $t('page.auth.codeLogin'),
        },
      },
      {
        name: 'QrCodeLogin',
        path: 'qrcode-login',
        component: () =>
          import('#/views/_core/authentication/qrcode-login.vue'),
        meta: {
          title: $t('page.auth.qrcodeLogin'),
        },
      },
      {
        name: 'ForgetPassword',
        path: 'forget-password',
        component: () =>
          import('#/views/_core/authentication/forget-password.vue'),
        meta: {
          title: $t('page.auth.forgetPassword'),
        },
      },
      {
        name: 'Register',
        path: 'register',
        component: () => import('#/views/_core/authentication/register.vue'),
        meta: {
          title: $t('page.auth.register'),
        },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute, microPrefixNotFoundRoutes };
