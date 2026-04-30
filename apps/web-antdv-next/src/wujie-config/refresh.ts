// apps/web-antdv-next/src/wujie-config/refresh.ts
import WujieVue from 'wujie-vue3';

import { HOST_BRIDGE_REFRESH } from './event';

const { bus } = WujieVue;

export function notifyChildAppsRefresh() {
  bus.$emit(HOST_BRIDGE_REFRESH, { ts: Date.now() });
}

export type GlobalRefreshFn = () => void;
export type RefreshGlobal = {
  __VBEN_NOTIFY_CHILD_APPS_REFRESH__?: GlobalRefreshFn;
};

export function setupGlobalRefreshBridge() {
  (globalThis as unknown as RefreshGlobal).__VBEN_NOTIFY_CHILD_APPS_REFRESH__ =
    notifyChildAppsRefresh;
}
