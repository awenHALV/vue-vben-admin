import type { TabDefinition } from '@vben/types';

import type {
  HostBridgeCloseTabPayload,
  HostBridgeLanguageChangePayload,
  HostBridgeState,
  HostBridgeTabChangePayload,
  HostBridgeThemeChangePayload,
} from './event';

import { nextTick, watch } from 'vue';

import { preferences } from '@vben/preferences';
import { getTabKey, useAccessStore, useTabbarStore } from '@vben/stores';

import WujieVue from 'wujie-vue3';

import { router } from '#/router';
import { useAuthStore } from '#/store';
import { getMicroProjectCodeFromRoutePath } from '#/wujie-config/micro-route';

import {
  BUTTON_PERMISSION_LIST,
  BUTTON_PERMISSION_LIST_CHANGE,
  CHANGELANUAGE_EVENT,
  CHANGETHEME_EVENT,
  CLOSE_TAB_EVENT,
  HOST_BRIDGE_HOST_STATE_PUSH,
  HOST_BRIDGE_REQUEST_BUILTIN_THEME,
  HOST_BRIDGE_REQUEST_COLOR_MODE,
  HOST_BRIDGE_REQUEST_HOST_STATE,
  HOST_BRIDGE_REQUEST_TOKEN,
  HOST_BRIDGE_TAB_CHANGE,
  JUMPROUTE_EVENT,
  LOGOUT_EVENT,
  NOTICECHILDAPPTOKEN_EVENT,
} from './event';
import website from './website';

const { bus } = WujieVue;

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function getPathname(path: string): string {
  return path.split(/[?#]/)[0] ?? '';
}

function toHostMicroPath(projectCode: string, path: string): string {
  const normalized = ensureLeadingSlash(String(path ?? '').trim());
  const projectPrefix = `/${projectCode}`;
  if (
    normalized === projectPrefix ||
    normalized.startsWith(`${projectPrefix}/`)
  ) {
    return normalized;
  }
  return `${projectPrefix}${normalized}`;
}

/** 与基座 UI 一致的明暗解析（含 theme.mode === 'auto'） */
function getResolvedColorMode(): 'dark' | 'light' {
  const mode = preferences.theme.mode;
  if (mode === 'dark') {
    return 'dark';
  }
  if (mode === 'light') {
    return 'light';
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
}

/**
 * 路由 push 完成后，tabbar 对 `route.fullPath` 的 watch 可能尚未把 tab 写入 store。
 * 通过对 `tabs` 的 watch 在下一帧响应即可，避免 20×16ms 定时轮询带来的卡顿与主线程占用。
 */
function waitTabByKey(
  tabbarStore: ReturnType<typeof useTabbarStore>,
  key: string,
  timeoutMs: number,
): Promise<TabDefinition | undefined> {
  const existing = tabbarStore.getTabByKey(key);
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    const finish = (tab?: TabDefinition) => {
      stop();
      window.clearTimeout(timer);
      resolve(tab);
    };

    const stop = watch(
      () => tabbarStore.tabs,
      () => {
        const tab = tabbarStore.getTabByKey(key);
        if (tab) {
          finish(tab);
        }
      },
      { deep: true, flush: 'post' },
    );

    const timer = window.setTimeout(() => {
      finish(undefined);
    }, timeoutMs);
  });
}

function buildHostState(
  accessStore: ReturnType<typeof useAccessStore>,
): HostBridgeState {
  return {
    token: accessStore.accessToken ?? '',
    colorMode: getResolvedColorMode(),
    builtinType: preferences.theme.builtinType,
    locale: preferences.app.locale,
  };
}

function buildMicroTabChangePayload(): HostBridgeTabChangePayload | null {
  const route = router.currentRoute.value;
  const projectCode =
    (route.meta.microName as string | undefined) ??
    getMicroProjectCodeFromRoutePath(route.fullPath);
  if (!projectCode) {
    return null;
  }

  return {
    projectCode,
    fullPath: route.fullPath,
    path: route.path,
    name: route.name ? String(route.name) : undefined,
    tabKey: getTabKey(route),
  };
}

/**
 * 注册主应用侧 Wujie bus：响应子应用的 token / 主题相关请求，并在状态变化时广播。
 * 须在 Pinia `initStores` 之后调用。
 */
export function setupWujieHostBridge() {
  const accessStore = useAccessStore();
  const tabbarStore = useTabbarStore();

  /** 获取子应用关联的扁平化权限码列表 */
  function getProjectAccessCodes(projectCode: string) {
    const codes = new Set<string>();
    const map = accessStore.menuPathToDirectButtonCodes;
    Object.keys(map).forEach((path) => {
      // 匹配属于该子应用的路径
      if (path.startsWith(`/${projectCode}/`) || path === `/${projectCode}`) {
        map[path]?.forEach((code) => codes.add(code));
      }
    });
    return [...codes];
  }

  function findTabByHostPath(hostPath: string): TabDefinition | undefined {
    const decodedHostPath = safeDecodeURIComponent(hostPath);
    const hostPathname = getPathname(decodedHostPath);
    const shouldMatchFullPath = /[?#]/.test(decodedHostPath);

    return tabbarStore.getTabs.find((tab) => {
      const candidates = [tab.key, tab.fullPath, tab.path]
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map(safeDecodeURIComponent);

      return candidates.some((candidate) => {
        if (candidate === decodedHostPath) {
          return true;
        }
        if (shouldMatchFullPath) {
          return false;
        }
        return getPathname(candidate) === hostPathname;
      });
    });
  }

  async function handleCloseMicroTab(
    projectCode: string,
    payload: HostBridgeCloseTabPayload,
  ) {
    if (!payload?.currentPath) {
      return;
    }

    const currentHostPath = toHostMicroPath(projectCode, payload.currentPath);
    const tab = findTabByHostPath(currentHostPath);
    if (!tab) {
      return;
    }

    const tabKey = tab.key ?? tab.fullPath ?? tab.path;
    if (!tabKey) {
      return;
    }

    if (payload.toPath) {
      const toHostPath = toHostMicroPath(projectCode, payload.toPath);
      if (router.currentRoute.value.fullPath !== toHostPath) {
        await router.replace(toHostPath);
      }
    }

    await tabbarStore.closeTabByKey(tabKey, router);
  }

  bus.$on(HOST_BRIDGE_REQUEST_TOKEN, (callback?: (token: string) => void) => {
    if (typeof callback === 'function') {
      callback(accessStore.accessToken ?? '');
    }
  });

  bus.$on(
    HOST_BRIDGE_REQUEST_COLOR_MODE,
    (callback?: (mode: 'dark' | 'light') => void) => {
      if (typeof callback === 'function') {
        callback(getResolvedColorMode());
      }
    },
  );

  bus.$on(
    HOST_BRIDGE_REQUEST_BUILTIN_THEME,
    (callback?: (builtinType: HostBridgeState['builtinType']) => void) => {
      if (typeof callback === 'function') {
        callback(preferences.theme.builtinType);
      }
    },
  );

  bus.$on(
    HOST_BRIDGE_REQUEST_HOST_STATE,
    (callback?: (state: HostBridgeState) => void) => {
      if (typeof callback === 'function') {
        callback(buildHostState(accessStore));
      }
    },
  );

  // 监听子应用 401 / token 失效上报 → 基座统一退出（会广播 HOST_BRIDGE_LOGOUT_NOTIFY_CHILD）
  bus.$on(LOGOUT_EVENT, () => {
    const authStore = useAuthStore();
    void authStore.terminateSession(true, { reason: 'session_expired' });
  });

  // 监听子应用权限码请求
  website.projectCodes.forEach((projectCode) => {
    bus.$on(
      BUTTON_PERMISSION_LIST(projectCode),
      (callback?: (codes: string[]) => void) => {
        if (typeof callback === 'function') {
          callback(getProjectAccessCodes(projectCode));
        }
      },
    );
  });

  website.projectCodes.forEach((projectCode) => {
    bus.$on(
      CLOSE_TAB_EVENT(projectCode),
      (payload: HostBridgeCloseTabPayload) => {
        void handleCloseMicroTab(projectCode, payload);
      },
    );
  });

  function emitHostStatePush() {
    bus.$emit(HOST_BRIDGE_HOST_STATE_PUSH, buildHostState(accessStore));
  }

  type JumpRoutePayload = {
    path: string;
    query?: Record<string, string | undefined>;
    tabPlacement?: 'afterCurrent' | 'append';
  };

  function moveTabAfterAnchor(
    tabbarStore: ReturnType<typeof useTabbarStore>,
    targetKey: string,
    anchorKey: string,
  ) {
    const tabs = tabbarStore.getTabs;

    const targetIndex = tabs.findIndex((tab) => getTabKey(tab) === targetKey);
    const anchorIndex = tabs.findIndex((tab) => getTabKey(tab) === anchorKey);

    if (targetIndex === -1 || anchorIndex === -1) {
      return;
    }

    if (targetIndex === anchorIndex || targetIndex === anchorIndex + 1) {
      return;
    }

    const newIndex = targetIndex < anchorIndex ? anchorIndex : anchorIndex + 1;

    tabbarStore.sortTabs(targetIndex, newIndex);
    tabbarStore.setUpdateTime();
  }

  // 监听子路由跳转：基座地址栏以本次 push 的 path 为准，须与子应用实际页面一致（含 /detail/:id 等动态段）
  bus.$on(JUMPROUTE_EVENT, async (payload: JumpRoutePayload) => {
    console.log('paypay', payload);
    const title = payload.query?.title;
    const { title: _ignored, ...query } = payload.query ?? {};

    // push 前记录当前 tab，也就是 A tab
    const anchorKey =
      payload.tabPlacement === 'afterCurrent'
        ? getTabKey(router.currentRoute.value)
        : undefined;

    // push 前 resolve 目标路由，提前锁定 B tab 的 key
    const targetRoute = router.resolve({
      path: payload.path,
      query,
    });
    const targetKey = getTabKey(targetRoute);

    // push 前判断目标 tab 是否已存在
    const existedBefore = tabbarStore.getTabs.some(
      (tab) => getTabKey(tab) === targetKey,
    );

    await router.push({
      path: payload.path,
      query,
    });

    await nextTick();

    const tab = await waitTabByKey(tabbarStore, targetKey, 500);

    if (tab && title) {
      await tabbarStore.setTabTitle(tab, title);
      tabbarStore.setUpdateTime();
    }

    if (
      tab &&
      anchorKey &&
      payload.tabPlacement === 'afterCurrent' &&
      !existedBefore
    ) {
      moveTabAfterAnchor(tabbarStore, targetKey, anchorKey);
    }
  });

  function emitChangeThemeToChild() {
    const payload: HostBridgeThemeChangePayload = {
      builtinType: preferences.theme.builtinType,
      colorMode: getResolvedColorMode(),
      themeMode: preferences.theme.mode,
    };
    bus.$emit(CHANGETHEME_EVENT, payload);
  }

  function emitChangeLanguageToChild() {
    const payload: HostBridgeLanguageChangePayload = {
      locale: preferences.app.locale,
    };
    bus.$emit(CHANGELANUAGE_EVENT, payload);
  }

  function emitNoticeChildToken() {
    bus.$emit(NOTICECHILDAPPTOKEN_EVENT, {
      token: accessStore.accessToken ?? '',
    });
  }

  function emitMicroTabChange() {
    const payload = buildMicroTabChangePayload();
    if (!payload) {
      return;
    }
    bus.$emit(HOST_BRIDGE_TAB_CHANGE, payload);
  }

  watch(
    () => ({
      token: accessStore.accessToken,
      mode: preferences.theme.mode,
      builtinType: preferences.theme.builtinType,
      locale: preferences.app.locale,
    }),
    () => emitHostStatePush(),
    { immediate: true },
  );

  watch(
    () => ({
      builtinType: preferences.theme.builtinType,
      mode: preferences.theme.mode,
    }),
    () => emitChangeThemeToChild(),
    { immediate: true },
  );

  watch(
    () => preferences.app.locale,
    () => emitChangeLanguageToChild(),
    { immediate: true },
  );

  watch(
    () => accessStore.accessToken,
    () => emitNoticeChildToken(),
    { immediate: true },
  );

  watch(
    () => router.currentRoute.value.fullPath,
    () => emitMicroTabChange(),
    { flush: 'post' },
  );

  // 监听菜单变化并自动派发权限码给子应用
  watch(
    () => accessStore.accessMenus,
    (menus) => {
      if (!menus || menus.length === 0) {
        return;
      }

      website.projectCodes.forEach((code) => {
        const projectCodes = getProjectAccessCodes(code);
        bus.$emit(BUTTON_PERMISSION_LIST_CHANGE(code), projectCodes);
      });
    },
    { deep: true, immediate: true },
  );
}

export function emitChangeThemeToChildWithTab() {
  const payload: HostBridgeThemeChangePayload = {
    builtinType: preferences.theme.builtinType,
    colorMode: getResolvedColorMode(),
    themeMode: preferences.theme.mode,
  };
  bus.$emit(CHANGETHEME_EVENT, payload);
}
