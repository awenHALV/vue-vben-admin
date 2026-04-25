import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';

const dynamicRouteFiles = import.meta.glob('./modules/**/*.ts', {
  eager: true,
});

// 有需要可以自行打开注释，并创建文件夹
// const externalRouteFiles = import.meta.glob('./external/**/*.ts', { eager: true });
// const staticRouteFiles = import.meta.glob('./static/**/*.ts', { eager: true });

/** 动态路由 */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

/** 外部路由列表，访问这些页面可以不需要Layout，可能用于内嵌在别的系统(不会显示在菜单中) */
// const externalRoutes: RouteRecordRaw[] = mergeRouteModules(externalRouteFiles);
// const staticRoutes: RouteRecordRaw[] = mergeRouteModules(staticRouteFiles);
const staticRoutes: RouteRecordRaw[] = [];
const externalRoutes: RouteRecordRaw[] = [];

/** 路由列表，由基本路由、外部路由和404兜底路由组成
 *  无需走权限验证（会一直显示在菜单中） */
const routes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...externalRoutes,
  fallbackNotFoundRoute,
];

// 🌟 核心逻辑：递归遍历所有路由，强制注入 keepAlive: true
function forceEnableKeepAlive(routeList: RouteRecordRaw[]) {
  routeList.forEach((route) => {
    // 【优化】边界保护：404兜底路由、外链或明确标记忽略的路由不强行开启缓存
    if (
      route.name === 'FallbackNotFound' ||
      route.meta?.iframeSrc ||
      route.meta?.ignoreKeepAlive
    ) {
      return;
    }

    // 确保 meta 对象存在，并强制设置 keepAlive 属性
    route.meta = {
      ...route.meta,
      keepAlive: true,
    };

    // 如果存在子路由，继续向下层递归查找并设置
    if (route.children && route.children.length > 0) {
      forceEnableKeepAlive(route.children);
    }
  });
}

/** 有权限校验的路由列表，包含动态路由和静态路由 */
const accessRoutes = [...dynamicRoutes, ...staticRoutes];

forceEnableKeepAlive(routes);
forceEnableKeepAlive(accessRoutes);

/** 基本路由列表，这些路由不需要进入权限拦截 */
const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

export { accessRoutes, coreRouteNames, routes };
