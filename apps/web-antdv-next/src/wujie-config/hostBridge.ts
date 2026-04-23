import type {
  HostBridgeLanguageChangePayload,
  HostBridgeState,
  HostBridgeThemeChangePayload,
} from './event';

import { watch } from 'vue';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import WujieVue from 'wujie-vue3';

import { router } from '#/router';
import { useAuthStore } from '#/store';

import {
  BUTTON_PERMISSION_LIST,
  BUTTON_PERMISSION_LIST_CHANGE,
  CHANGELANUAGE_EVENT,
  CHANGETHEME_EVENT,
  HOST_BRIDGE_HOST_STATE_PUSH,
  HOST_BRIDGE_REQUEST_BUILTIN_THEME,
  HOST_BRIDGE_REQUEST_COLOR_MODE,
  HOST_BRIDGE_REQUEST_HOST_STATE,
  HOST_BRIDGE_REQUEST_TOKEN,
  JUMPROUTE_EVENT,
  LOGOUT_EVENT,
  NOTICECHILDAPPTOKEN_EVENT,
} from './event';
import website from './website';

const { bus } = WujieVue;

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

/**
 * 注册主应用侧 Wujie bus：响应子应用的 token / 主题相关请求，并在状态变化时广播。
 * 须在 Pinia `initStores` 之后调用。
 */
export function setupWujieHostBridge() {
  const accessStore = useAccessStore();

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

  // 监听 VPP 子应用菜单请求
  bus.$on(BUTTON_PERMISSION_LIST('vpp'), (callback) => {
    if (typeof callback === 'function') {
      callback(getProjectAccessCodes('vpp'));
    }
  });

  function emitHostStatePush() {
    bus.$emit(HOST_BRIDGE_HOST_STATE_PUSH, buildHostState(accessStore));
  }

  // 监听子路由跳转
  bus.$on(
    JUMPROUTE_EVENT,
    (payload: { path: string; query?: Record<string, string> }) => {
      const target = router.resolve(payload);
      if (target.fullPath === router.currentRoute.value.fullPath) {
        return;
      }
      void router.push(payload);
    },
  );

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
