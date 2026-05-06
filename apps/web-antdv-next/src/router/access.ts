import type { RouteRecordRaw } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { cloneDeep } from '@vben/utils';

import { message } from 'antdv-next';

import { getAllMenusApi, takeMenuButtonPermissionSnapshot } from '#/api';
import { BasicLayout, IFrameView, ParentLayout } from '#/layouts';
import { $t } from '#/locales';

import { transformComponentMap } from './component-map';
import { microPrefixNotFoundRoutes } from './routes/core';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 微应用前缀下的「通配容器路由」必须使用通配子路由；若写在 core 静态 children 里且排在
 * generateAccessible 注入的菜单路由之前，刷新深链时通配会先命中，合法菜单页也会走错页。
 * 因此在菜单合并完成后追加到 Root.children 末尾（保证菜单路由先匹配，未知路径再走容器）。
 *
 * 使用 `router.addRoute('Root', route)` 挂载：对 `getRoutes()` 返回对象改 `children` 再 `addRoute(root)`
 * 在 Vue Router 4 下可能不生效，表现为 `/vpp/**` 详情仍命中全局 404。
 */
function appendMicroPrefixNotFoundRoutes(
  router: GenerateMenuAndRoutesOptions['router'],
) {
  const rootName = 'Root';
  if (!router.hasRoute(rootName)) {
    return;
  }

  for (const route of microPrefixNotFoundRoutes) {
    const n = route.name;
    if (n && router.hasRoute(String(n))) {
      router.removeRoute(n);
    }
  }

  for (const route of microPrefixNotFoundRoutes) {
    router.addRoute(rootName, cloneDeep(route) as RouteRecordRaw);
  }
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = transformComponentMap(
    import.meta.glob('../views/**/*.vue'),
  );

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
    ParentLayout,
  };

  const result = await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      const routes = await getAllMenusApi();
      const snapshot = takeMenuButtonPermissionSnapshot();
      if (snapshot) {
        const accessStore = useAccessStore();
        accessStore.setAccessCodes(snapshot.allButtonCodes);
        accessStore.setMenuPathToDirectButtonCodes(
          snapshot.menuPathToDirectButtonCodes,
        );
      }
      return routes;
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
