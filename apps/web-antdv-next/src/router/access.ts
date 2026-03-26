import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore, useTabbarStore } from '@vben/stores';

import { message } from 'antdv-next';

import { getAllMenusApi, takeMenuButtonPermissionSnapshot } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/**
 * 拉取后端菜单、按 accessMode 生成可访问路由，并在菜单变更后同步标签栏。
 *
 * - 无可用菜单：清空全部 tab、访问历史与 keep-alive 缓存，避免残留无权限页签。
 * - 有菜单：裁剪路径已不在新菜单树中的 tab（含固定页），当前页被关时跳到剩余 tab 或首菜单/默认首页。
 *
 * 典型场景：登录后首次进入、切换租户、刷新菜单权限。
 */
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

  // 菜单刷新后同步标签栏：无菜单则清空；有菜单则关掉已不在新菜单树中的 tab（含 affix），避免切换租户等场景残留
  const tabbarStore = useTabbarStore();
  await (result.accessibleMenus.length === 0
    ? tabbarStore.clearTabsForEmptyMenus()
    : tabbarStore.pruneTabsNotInMenus(result.accessibleMenus, options.router));

  return result;
}

export { generateAccess };
