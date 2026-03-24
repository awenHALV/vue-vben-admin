import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

interface AccessMenuItem {
  children?: AccessMenuItem[];
  path?: string;
}

function getFirstMenuPath(menus: AccessMenuItem[]): string {
  for (const menu of menus) {
    const children = menu.children ?? [];
    if (children.length > 0) {
      const childPath = getFirstMenuPath(children);
      if (childPath) {
        return childPath;
      }
    }

    const path = menu.path ?? '';
    if (path && !path.startsWith('http')) {
      return path;
    }
  }
  return '';
}

/** Vue Router 的 query 可能为 string | string[] */
function normalizeQueryParam(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 个人中心挂在 core 下，但仍需登录（避免与「基本路由免 token」冲突）
    if (to.name === 'Profile' && !accessStore.accessToken) {
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
      return to;
    }

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      // 个人中心挂在 BasicLayout 下，侧栏依赖 generateAccess 写入的菜单；刷新直达时若尚未生成权限，
      // 不可在此提前 return，否则 accessMenus 为空，左侧菜单空白。
      const profileNeedsMenus =
        to.name === 'Profile' &&
        accessStore.accessToken &&
        !accessStore.isAccessChecked;
      if (!profileNeedsMenus) {
        return true;
      }
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      return true;
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo.roles ?? [];

    // 生成菜单和路由
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // 则会在菜单中显示，但是访问会被重定向到403
      routes: accessRoutes,
    });

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    const firstMenuPath = getFirstMenuPath(accessibleMenus as AccessMenuItem[]);
    const requestedDefaultHome =
      to.path === preferences.app.defaultHomePath ||
      to.fullPath === preferences.app.defaultHomePath;

    const rawRedirect = normalizeQueryParam(from.query.redirect);
    let pathFromQuery: string | undefined;
    if (rawRedirect) {
      try {
        pathFromQuery = decodeURIComponent(rawRedirect);
      } catch {
        pathFromQuery = rawRedirect;
      }
    }

    let redirectPath =
      pathFromQuery ||
      (requestedDefaultHome
        ? userInfo.homePath || firstMenuPath || preferences.app.defaultHomePath
        : to.fullPath);

    // 已登录时若目标仍是登录页，改去首页，避免与「登录页带 token 再跳首页」逻辑打架形成死循环
    if (
      redirectPath === LOGIN_PATH ||
      redirectPath.startsWith(`${LOGIN_PATH}?`)
    ) {
      redirectPath =
        userInfo.homePath || firstMenuPath || preferences.app.defaultHomePath;
    }

    let resolved: ReturnType<Router['resolve']>;
    try {
      resolved = router.resolve(redirectPath);
    } catch {
      resolved = router.resolve(preferences.app.defaultHomePath);
    }

    // 目标与当前导航一致时勿再 replace，否则会触发 pushWithRedirect 无限递归
    if (resolved.fullPath === to.fullPath) {
      // 首次进入时 URL 往往先命中顶层兜底 `/:path(.*)*`（FallbackNotFound），动态路由尚未注册；
      // 注册后同一 fullPath 应对应真实页面，若仍直接 return true，会沿用旧的 404 匹配结果。
      if (to.name !== resolved.name) {
        return {
          path: resolved.path,
          query: resolved.query,
          hash: resolved.hash,
          replace: true,
        };
      }
      return true;
    }

    return {
      path: resolved.path,
      query: resolved.query,
      hash: resolved.hash,
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
