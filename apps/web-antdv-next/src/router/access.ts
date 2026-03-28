import type { RouteRecordRaw } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'antdv-next';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

import { microPrefixNotFoundRoutes } from './routes/core';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

const MICRO_NOT_FOUND_ROUTE_NAME_PREFIX = 'MicroNotFound_';

/**
 * 微应用前缀下的「内容区 404」必须使用通配子路由；若写在 core 静态 children 里且排在
 * generateAccessible 注入的菜单路由之前，刷新深链时通配会先命中，合法页也会 404。
 * 因此在菜单合并完成后追加到 Root.children 末尾。
 */
function appendMicroPrefixNotFoundRoutes(
  router: GenerateMenuAndRoutesOptions['router'],
) {
  const root = router.getRoutes().find((item) => item.path === '/');
  if (!root?.name) {
    return;
  }

  const kept = (root.children ?? []).filter(
    (child) =>
      !String(child.name ?? '').startsWith(MICRO_NOT_FOUND_ROUTE_NAME_PREFIX),
  );
  root.children = [...kept, ...microPrefixNotFoundRoutes];

  router.removeRoute(root.name);
  router.addRoute(root as RouteRecordRaw);
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const result = await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      return await getAllMenusApi();
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });

  appendMicroPrefixNotFoundRoutes(options.router);

  return result;
}

export { generateAccess };
