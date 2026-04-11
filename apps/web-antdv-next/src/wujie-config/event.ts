/*
无界事件
*/

import type { Preferences } from '@vben/preferences';

import WujieVue from 'wujie-vue3';

/**
 * 主应用向子应用推送的完整宿主状态（token / 明暗 / 内置主题 / 语言）
 * 主应用加载完成、以及上述任一字段变化时都会推送。
 * 子应用监听：window.$wujie?.bus?.$on(HOST_BRIDGE_HOST_STATE_PUSH, handler)
 */
export const HOST_BRIDGE_HOST_STATE_PUSH = 'hostBridge:hostStatePush';

/**
 * 子应用请求 token：bus.$emit(HOST_BRIDGE_REQUEST_TOKEN, (token: string) => void)
 * 主应用已注册，通过回调回传（与 props.token 并存，便于子应用按需拉取）
 */
export const HOST_BRIDGE_REQUEST_TOKEN = 'hostBridge:requestToken';

/**
 * 子应用请求当前解析后的明暗：'dark' | 'light'（含 auto 时按系统解析）
 * bus.$emit(HOST_BRIDGE_REQUEST_COLOR_MODE, (mode) => void)
 */
export const HOST_BRIDGE_REQUEST_COLOR_MODE = 'hostBridge:requestColorMode';

/**
 * 子应用请求当前内置主题类型（preferences.theme.builtinType，如 default、violet）
 * bus.$emit(HOST_BRIDGE_REQUEST_BUILTIN_THEME, (builtinType) => void)
 */
export const HOST_BRIDGE_REQUEST_BUILTIN_THEME =
  'hostBridge:requestBuiltinTheme';

/**
 * 子应用一次拉取完整状态（推荐）
 * bus.$emit(HOST_BRIDGE_REQUEST_HOST_STATE, (state: HostBridgeState) => void)
 */
export const HOST_BRIDGE_REQUEST_HOST_STATE = 'hostBridge:requestHostState';

/** 主应用通过 bus 回传给子应用的结构 */
export interface HostBridgeState {
  /** 访问令牌，可能为空字符串 */
  token: string;
  /** 已解析的明暗模式（非 preferences 原始 mode 字段） */
  colorMode: 'dark' | 'light';
  /** 内置主题类型，与基座 preferences.theme.builtinType 一致 */
  builtinType: Preferences['theme']['builtinType'];
  /** 与基座 preferences.app.locale 一致 */
  locale: Preferences['app']['locale'];
}

/** 主应用主题变更广播（与 CHANGETHEME_EVENT 载荷一致，便于子应用单独订阅） */
export interface HostBridgeThemeChangePayload {
  builtinType: Preferences['theme']['builtinType'];
  colorMode: 'dark' | 'light';
  themeMode: Preferences['theme']['mode'];
}

/** 主应用语言变更广播 */
export interface HostBridgeLanguageChangePayload {
  locale: Preferences['app']['locale'];
}

/**
 * 主应用会话结束（主动退出 / 主应用 401 / 子应用上报失效等）时广播。
 * 子应用应：清空本地缓存、Pinia、路由栈、与登录态相关的 storage 等。
 * 监听：window.$wujie?.bus?.$on(HOST_BRIDGE_LOGOUT_NOTIFY_CHILD, handler)
 */
export const HOST_BRIDGE_LOGOUT_NOTIFY_CHILD = 'hostBridge:logoutNotifyChild';

export interface HostBridgeLogoutNotifyPayload {
  /** user：用户点击退出；session_expired：令牌失效；unauthorized：主应用 401 等 */
  reason?: 'session_expired' | 'unauthorized' | 'user';
}

const { bus: wujieBus } = WujieVue;

/**
 * 通知所有无界子应用：基座会话已结束，请自行清空缓存与本地登录态。
 * 在清主应用 Pinia / 跳转登录页之前调用，便于子应用仍能通过 bus 收到一次广播。
 */
export function notifyChildAppsLogout(
  payload: HostBridgeLogoutNotifyPayload = {},
) {
  wujieBus.$emit(HOST_BRIDGE_LOGOUT_NOTIFY_CHILD, payload);
}

// 切换主题（主应用加载、主题/明暗模式切换时触发）
export const CHANGETHEME_EVENT = 'changeThemeEvent';
// 中英文切换（主应用加载、语言切换时触发）
export const CHANGELANUAGE_EVENT = 'changeLanguage';
// 监听子应用通知基座退出登录事件
export const LOGOUT_EVENT = 'logoutEvent';
// 通知子应用刷新token
export const NOTICECHILDAPPTOKEN_EVENT = 'noticeChildAppTokenEvent';
// 监听子应用token更新-》同步到基座
// export const NOTICEBASEAPPTOKEN_EVENT = 'noticeBaseAppTokenEvent';
// 监听来自子应用的路由跳转
export const JUMPROUTE_EVENT = 'jumpRouteEvent';

// export const LOGOUT_CHILD_EVENT = 'logoutChildEvent';
// 通知子应用路由跳转
export const ROUTERCHANGE_EVENT = (projectCode: string) =>
  `${projectCode}:routerChangeEvent`;
// 通知子应用跳转到静态路由
export const JUMPROUTESTATIC_EVENT = (projectCode: string) =>
  `${projectCode}:jumpRouteStaticEvent`;
// 通知子应用菜单变更
export const BUTTON_PERMISSION_LIST_CHANGE = (projectCode: string) =>
  `${projectCode}:button:permission:change`;
// 监听 VPP 子应用菜单请求
export const BUTTON_PERMISSION_LIST = (projectCode: string) =>
  `${projectCode}:button:permission:list`;
// 子应用离开时触发
export const DEACTIVATEDAPP = (projectCode: string) =>
  `${projectCode}:deactivatedApp`;
// 切换租户
export const SWITCHTENANT_EVENT = 'switchTenantEvent';
// editior
export const OPENANNOUNCEMODAL = 'openAnnounceModal';
// success
export const ANNOUNCEOPERATESUCCESS = 'announceOperateSuccess';

// 销毁子组件
export const DISPOSECOMPOMENTS = 'disposeComponents';

// 监听子应用打开巡检方案弹框
export const OPEN_INSPECT_SCHEME_DIALOG_SEND = `noticeInspectOpenSend`;
export const OPEN_INSPECT_SCHEME_DIALOG_RECEIVE = `noticeInspectOpenReceive`;
