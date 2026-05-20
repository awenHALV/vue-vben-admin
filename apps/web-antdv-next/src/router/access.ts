import type { RouteRecordRaw } from 'vue-router';

import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  MenuRecordRaw,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { cloneDeep } from '@vben/utils';

import { message } from 'antdv-next';

import {
  getAllMenusApi,
  normalizeMenuPermissionPath,
  takeMenuButtonPermissionSnapshot,
} from '#/api';
import { BasicLayout, IFrameView, ParentLayout } from '#/layouts';
import { $t } from '#/locales';

import { transformComponentMap } from './component-map';
import { microPrefixNotFoundRoutes } from './routes/core';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

interface SandboxAppMenu {
  children?: SandboxAppMenu[];
  featureIcon?: string;
  featureName: string;
  featureNameEn?: string;
  routePath: string;
}

interface SandboxCustomApp {
  id: string;
  menus: SandboxAppMenu[];
}

const CUSTOM_APPS_SESSION_KEY = 'workbench_custom_apps';
const CUSTOM_APP_SANDBOX_SESSION_KEY = 'workbench_app_sandbox';

function parseSessionJson<T>(key: string): T | undefined {
  const value = sessionStorage.getItem(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return undefined;
  }
}

function getSandboxAppId() {
  const searchParams = new URLSearchParams(window.location.search);
  const appIdFromUrl = searchParams.get('appId');
  if (appIdFromUrl) {
    return appIdFromUrl;
  }

  const sandbox = parseSessionJson<{
    appId?: string;
  }>(CUSTOM_APP_SANDBOX_SESSION_KEY);
  return sandbox?.appId || '';
}

function findSandboxApp() {
  const appId = getSandboxAppId();
  if (!appId) {
    return undefined;
  }

  const sandbox = parseSessionJson<{
    app?: SandboxCustomApp;
    appId: string;
  }>(CUSTOM_APP_SANDBOX_SESSION_KEY);
  if (sandbox?.app && sandbox.appId === appId) {
    return sandbox.app;
  }

  // TODO: 后端接口就绪后，替换为根据 appId 读取应用绑定菜单。
  // return await getCustomAppConfigApi(appId);
  const apps = parseSessionJson<SandboxCustomApp[]>(CUSTOM_APPS_SESSION_KEY);
  return apps?.find((app) => app.id === appId);
}

function collectSandboxMenuPaths(
  menus: SandboxAppMenu[],
  paths = new Set<string>(),
  parentPath?: string,
) {
  for (const menu of menus) {
    const path = resolveAbsoluteRoutePath(menu.routePath, parentPath);
    if (path) {
      paths.add(path);
    }
    collectSandboxMenuPaths(menu.children ?? [], paths, path);
  }

  return paths;
}

function pathSegmentsStartWithParent(
  pathSegments: string[],
  parentSegments: string[],
) {
  if (pathSegments.length < parentSegments.length) {
    return false;
  }

  return parentSegments.every(
    (seg, index) => seg.toLowerCase() === pathSegments[index]?.toLowerCase(),
  );
}

function resolveAbsoluteRoutePath(routePath: string, parentPath?: string) {
  const trimmed = String(routePath ?? '').trim();
  if (!trimmed) {
    return normalizeMenuPermissionPath(parentPath ?? '');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const raw = normalizeMenuPermissionPath(trimmed);
  if (!parentPath || /^https?:\/\//i.test(parentPath)) {
    return raw;
  }

  const parentNorm = normalizeMenuPermissionPath(parentPath);
  if (!parentNorm || parentNorm === '/') {
    return raw;
  }

  const rawSegments = raw.split('/').filter(Boolean);
  const parentSegments = parentNorm.split('/').filter(Boolean);
  if (pathSegmentsStartWithParent(rawSegments, parentSegments)) {
    return `/${rawSegments.join('/')}`;
  }

  return `/${[...parentSegments, ...rawSegments].join('/')}`;
}

function filterRoutesBySandboxMenus(
  routes: RouteRecordStringComponent[],
  allowedPaths: Set<string>,
  parentPath?: string,
): RouteRecordStringComponent[] {
  return routes
    .map((route) => {
      const path = resolveAbsoluteRoutePath(
        String(route.path ?? ''),
        parentPath,
      );
      const children = filterRoutesBySandboxMenus(
        (route.children ?? []) as RouteRecordStringComponent[],
        allowedPaths,
        path,
      );

      if (!allowedPaths.has(path) && children.length === 0) {
        return null;
      }

      return {
        ...route,
        children,
      };
    })
    .filter((route): route is RouteRecordStringComponent => !!route);
}

function filterSandboxRoutes(routes: RouteRecordStringComponent[]) {
  const sandboxApp = findSandboxApp();
  if (!sandboxApp) {
    return routes;
  }

  const allowedPaths = collectSandboxMenuPaths(sandboxApp.menus);
  return filterRoutesBySandboxMenus(routes, allowedPaths);
}

function findFirstSandboxMenuPath(menus: SandboxAppMenu[]): string {
  for (const menu of menus) {
    const path = normalizeMenuPermissionPath(menu.routePath);
    if (path) {
      return path;
    }

    const childPath = findFirstSandboxMenuPath(menu.children ?? []);
    if (childPath) {
      return childPath;
    }
  }

  return '';
}

function sandboxMenuToMenuRecord(menu: SandboxAppMenu): MenuRecordRaw {
  const children = (menu.children ?? []).map((child) =>
    sandboxMenuToMenuRecord(child),
  );
  const path =
    normalizeMenuPermissionPath(menu.routePath) ||
    findFirstSandboxMenuPath(menu.children ?? []);

  return {
    name: menu.featureName,
    featureName: menu.featureName,
    featureNameEn: menu.featureNameEn,
    icon: menu.featureIcon,
    path,
    show: true,
    ...(children.length > 0 ? { children } : {}),
  };
}

function getSandboxAccessibleMenus() {
  return findSandboxApp()?.menus.map((menu) => sandboxMenuToMenuRecord(menu));
}

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
      const routes = filterSandboxRoutes(await getAllMenusApi());
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

  const sandboxMenus = getSandboxAccessibleMenus();
  if (sandboxMenus) {
    result.accessibleMenus = sandboxMenus;
  }

  return result;
}

export { generateAccess };
