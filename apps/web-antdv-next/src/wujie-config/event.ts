/*
无界事件
*/

// 切换主题
export const CHANGETHEME_EVENT = 'changeThemeEvent';
// 中英文切换
export const CHANGELANUAGE_EVENT = 'changeLanguage';
// 监听子应用通知基座退出登录事件
export const LOGOUT_EVENT = 'logoutEvent';
// 通知子应用刷新token
export const NOTICECHILDAPPTOKEN_EVENT = 'noticeChildAppTokenEvent';
// 监听子应用token更新-》同步到基座
// export const NOTICEBASEAPPTOKEN_EVENT = 'noticeBaseAppTokenEvent';
// 监听来自子应用的路由跳转
export const JUMPROUTE_EVENT = 'jumpRouteEvent';
// 监听子应用完全退出登录事件
export const SSO_LOGOUT_EVENT = 'ssoLogoutEvent';

// 通知子应用退出登录事件
// export const LOGOUT_CHILD_EVENT = 'logoutChildEvent';
// 通知子应用路由跳转
export const ROUTERCHANGE_EVENT = (projectCode) =>
  `${projectCode}:routerChangeEvent`;
// 通知子应用跳转到静态路由
export const JUMPROUTESTATIC_EVENT = (projectCode) =>
  `${projectCode}:jumpRouteStaticEvent`;
// 子应用离开时触发
export const DEACTIVATEDAPP = (projectCode) => `${projectCode}:deactivatedApp`;
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
