/**
 * 登录后/顶栏：用 `POST .../auth/switch-tenant` + `tenantId` 换 token，再 `applyTenantTokenAndRefresh`。
 *
 * 租户管理列表「切换租户」走独立接口（private `auth-code` + public `/tenant/switch`），
 * 见 `views/system/tenant/index.vue`，仅复用本 composable 的 `applyTenantTokenAndRefresh`。
 */
import type { Router } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { setCookie, TOKEN_KEY } from '@vben/utils';

import { message } from 'antdv-next';

import { switchTenantPublicApi } from '#/api/core/auth';
import { $t } from '#/locales';
import { generateAccess } from '#/router/access';
import { persistAccessSnapshot } from '#/router/access-snapshot';
import { accessRoutes } from '#/router/routes';
import { useAuthStore } from '#/store';

/** 与 generateAccess 返回的菜单树结构一致，用于 DFS 找首个可导航 path */
interface AccessMenuItem {
  children?: AccessMenuItem[];
  path?: string;
}

/** 侧栏菜单深度优先：第一个带 path 且非外链的节点 */
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

/** 兼容接口返回 `token`、`accessToken` 或直接返回 token 字符串 */
export function extractTokenFromSwitchPayload(
  data: unknown,
): string | undefined {
  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.token === 'string') {
      return d.token;
    }
    if (typeof d.accessToken === 'string') {
      return d.accessToken;
    }
  }
  return undefined;
}

export function useTenantSwitchFlow(router: Router) {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const authStore = useAuthStore();

  /**
   * 写入新 token 后拉用户信息、重算动态路由与菜单，并按
   * homePath → 首个可访问菜单 → 默认首页 的顺序跳转（与 router/guard 登录后逻辑对齐）。
   */
  async function applyTenantTokenAndRefresh(token: string) {
    accessStore.setAccessToken(token);
    setCookie(TOKEN_KEY, token);
    if (accessStore.loginExpired) {
      accessStore.setLoginExpired(false);
    }
    await authStore.fetchUserInfo();
    const userRoles = userStore.userInfo?.roles ?? [];
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      routes: accessRoutes,
    });
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
    persistAccessSnapshot({
      accessCodes: accessStore.accessCodes,
      accessMenus: accessibleMenus,
      accessToken: accessStore.accessToken,
      menuPathToDirectButtonCodes: accessStore.menuPathToDirectButtonCodes,
    });

    const firstMenuPath = getFirstMenuPath(accessibleMenus as AccessMenuItem[]);
    const targetPath =
      userStore.userInfo?.homePath ||
      firstMenuPath ||
      preferences.app.defaultHomePath;

    let resolved: ReturnType<typeof router.resolve>;
    try {
      resolved = router.resolve(targetPath);
    } catch {
      resolved = router.resolve(preferences.app.defaultHomePath);
    }

    if (resolved.fullPath !== router.currentRoute.value.fullPath) {
      await router.replace({
        path: resolved.path,
        query: resolved.query,
        hash: resolved.hash,
      });
    }
  }

  /**
   * `POST /auth/switch-tenant` 传入 `tenantId` 换发 token；失败 message，成功则刷新菜单路由并 toast。
   */
  async function switchTenantByTenantId(tenantId: string): Promise<void> {
    if (tenantId === undefined || tenantId === null || tenantId === '') {
      message.error($t('tenant.message.switchTenantMissingId'));
      return;
    }
    const switchPayload = await switchTenantPublicApi({ tenantId });
    const token = extractTokenFromSwitchPayload(switchPayload);
    if (!token) {
      message.error($t('tenant.message.switchTenantFailed'));
      return;
    }
    await applyTenantTokenAndRefresh(token);
    message.success($t('tenant.message.switchTenantSuccess'));
  }

  return {
    applyTenantTokenAndRefresh,
    switchTenantByTenantId,
  };
}
