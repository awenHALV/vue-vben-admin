import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useAccess } from '@vben/access';
import { useAccessStore } from '@vben/stores';

import { normalizeMenuPermissionPath } from '#/api/core/menu';

/**
 * 页面级按钮：需同时满足 accessCodes 含该码，且当前路由对应 MENU 的直接子 BUTTON 含该码。
 */
export function usePageButtonAccess() {
  const route = useRoute();
  const accessStore = useAccessStore();
  const { hasAccessByCodes } = useAccess();

  const currentPathKey = computed(() =>
    normalizeMenuPermissionPath(route.path),
  );

  const directButtonCodesForCurrentPage = computed(() => {
    const key = currentPathKey.value;
    return accessStore.menuPathToDirectButtonCodes[key] ?? [];
  });

  function canButton(code: string): boolean {
    if (!hasAccessByCodes([code])) {
      return false;
    }
    const allowed = directButtonCodesForCurrentPage.value;
    return allowed.length > 0 && allowed.includes(code);
  }

  return {
    canButton,
    currentPathKey,
    directButtonCodesForCurrentPage,
  };
}
