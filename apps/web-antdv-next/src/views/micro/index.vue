<script setup lang="ts">
import type { MenuRecordRaw } from '@vben/types';

import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
} from 'vue';
import { useRoute } from 'vue-router';

import { i18n } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useTabbarStore } from '@vben/stores';
import { resolveMenuTitle } from '@vben/utils';

import { useTitle } from '@vueuse/core';
import WujieVue from 'wujie-vue3';

import { $t, $te } from '#/locales';
import { emitChangeThemeToChildWithTab } from '#/wujie-config/hostBridge.ts';
import {
  buildMicroUrl,
  getMicroProjectCodeFromRoutePath,
} from '#/wujie-config/micro-route';

defineOptions({ name: 'WujieWrapper' });

const { destroyApp } = WujieVue;
const route = useRoute();
const accessStore = useAccessStore();
const tabbarStore = useTabbarStore();

// ==========================================
// 🌟 核心机制：【实例路径锁定】
// 在 setup 初始化时固化当前路径，避免使用 computed 响应式追踪。
// 确保无论外部路由如何跳转，当前微应用容器始终与其首次挂载的路径强绑定，
// 从而有效解决多开同名微应用时的状态混淆问题。
// ==========================================
const myPath = route.fullPath;
// sleep 辅助函数，增强异步流程可读性
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const baseName = (route.meta.microName as string) || 'default-app';
// 用于无界实例隔离：将 fullPath 纳入唯一标识，避免 alive=true 时复用旧实例/旧 url
const myUniqueName = `${baseName}-${myPath}`;
const LOADING_WATCHDOG_MS = 3000;

const MICRO_URL_QUERY_BLOCKLIST = new Set(['pageKey', 'title']);

/**
 * 跳转已注册的路由时,需要merge一下quer
 * 排除title,因为title已作为tab的标签
 */
function mergeCurrentRouteQuery(url: string) {
  const [urlWithoutHash, hash = ''] = url.split('#');
  if (!urlWithoutHash) {
    return url;
  }

  const [pathname, rawQuery = ''] = urlWithoutHash.split('?');
  if (!pathname) {
    return url;
  }

  const params = new URLSearchParams(rawQuery);

  for (const [key, value] of Object.entries(route.query)) {
    if (MICRO_URL_QUERY_BLOCKLIST.has(key) || value === undefined) {
      continue;
    }

    params.delete(key);
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item !== null) {
        params.append(key, item);
      }
    });
  }

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

function resolveMicroUrl() {
  /**
   * 菜单路由由后端下发时，会在 `meta.microUrl` 写入完整子应用 URL（域名 + 子路径）。
   * 但「详情页 / 动态路由」往往不在菜单内，主应用只会命中 `/vpp/:pathMatch(.*)*` 这类通配容器路由，
   * 此时没有 `meta.microUrl`，需要根据当前地址栏的 `route.fullPath` 动态推导。
   */
  const url = route.meta.microUrl as string | undefined;
  if (url) {
    return mergeCurrentRouteQuery(url);
  }

  /**
   * 优先使用通配容器路由写入的 `meta.microName`（projectCode，如 vpp/zz/store）。
   * 若缺失，再从当前路径首段推断 projectCode，保证深链/刷新也能正确落到子应用。
   */
  const microName = (route.meta.microName as string | undefined) ?? '';
  const projectCode =
    microName || getMicroProjectCodeFromRoutePath(myPath) || '';
  if (!projectCode) {
    return undefined;
  }
  /**
   * 按「基座路径 → 子应用 URL」规则拼接：
   * - hostRoutePath: /vpp/customer/detail/123
   * - microUrl:      {VITE_APP_VPP}/customer/detail/123
   */
  return buildMicroUrl(projectCode, myPath);
}

const microUrl = resolveMicroUrl();
const microProps = computed(() => ({ token: accessStore.accessToken ?? '' }));

function normalizePath(path: string) {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function findMenuByPath(
  menus: MenuRecordRaw[],
  targetPath: string,
): MenuRecordRaw | undefined {
  const normalizedTargetPath = normalizePath(targetPath);

  for (const menu of menus) {
    if (normalizePath(menu.path) === normalizedTargetPath) {
      return menu;
    }

    const child = findMenuByPath(menu.children ?? [], normalizedTargetPath);
    if (child) {
      return child;
    }
  }
}

async function syncTabTitleWithMenu() {
  const menu = findMenuByPath(accessStore.accessMenus, route.path);
  if (!menu) {
    return;
  }

  const tab = tabbarStore.getTabByKey(route.fullPath);
  if (!tab) {
    return;
  }

  const titleSource = {
    title: menu.name,
    name: menu.name,
    featureName: menu.featureName,
    featureNameEn: menu.featureNameEn,
  };

  const title = resolveMenuTitle(titleSource, {
    locale: i18n.global.locale.value,
    t: (key) => key,
    te: () => false,
  });
  const titleZh = resolveMenuTitle(titleSource, {
    locale: 'zh-CN',
    t: (key) => key,
    te: () => false,
  });
  const titleEn = resolveMenuTitle(titleSource, {
    locale: 'en-US',
    t: (key) => key,
    te: () => false,
  });
  route.meta.title = title;
  const appName = $te(preferences.app.name)
    ? $t(preferences.app.name)
    : preferences.app.name;
  useTitle(`${title} - ${appName}`);

  await tabbarStore.setTabTitle(tab, titleZh);
  await tabbarStore.setTabTitleEn(tab, titleEn);
  tabbarStore.setUpdateTime();
}

// 渲染控制：【防白屏 & 生命周期管理 & 兜底策略】
const renderWujie = ref(false);
const showLoading = ref(true); // 控制遮罩层是否显示（顶层）
const retryCount = ref(0); // 记录当前重试次数
const MAX_RETRY = 2; // 最大重试次数，防止无限死循环
let loadingWatchdog: null | ReturnType<typeof setTimeout> = null;

function clearLoadingWatchdog() {
  if (loadingWatchdog !== null) {
    clearTimeout(loadingWatchdog);
    loadingWatchdog = null;
  }
}

function startLoadingWatchdog() {
  clearLoadingWatchdog();
  loadingWatchdog = setTimeout(() => {
    if (showLoading.value) {
      console.warn(`⏳ [沙箱挂载仍在进行] ${myUniqueName}`);
    }
  }, LOADING_WATCHDOG_MS);
}

function beginLoadingState() {
  showLoading.value = true;
  startLoadingWatchdog();
}

function finishLoadingState() {
  clearLoadingWatchdog();
  emitChangeThemeToChildWithTab();
  showLoading.value = false;
  retryCount.value = 0;
}

const safeMount = async () => {
  console.log('safeMount');
  if (!microUrl) {
    clearLoadingWatchdog();
    renderWujie.value = false;
    showLoading.value = false;
    return;
  }

  beginLoadingState();
  try {
    // 挂载无界组件
    renderWujie.value = true;
    await nextTick();
  } catch (error) {
    console.error(`🔴 [沙箱挂载/通信异常] ${myUniqueName}:`, error);

    // 兜底策略：强制重新加载
    if (retryCount.value < MAX_RETRY) {
      retryCount.value++;
      console.warn(
        `🔄 [触发兜底策略] 准备进行第 ${retryCount.value} 次重加载: ${myUniqueName}`,
      );

      // 先重置视图状态
      showLoading.value = true;
      renderWujie.value = false;
      clearLoadingWatchdog();

      // 彻底销毁当前可能已损坏的无界实例
      destroyApp(myUniqueName);

      // 给一点缓冲时间后重新尝试挂载
      await sleep(300);
      await safeMount();
    } else {
      console.error(
        `❌ [致命错误] 已达到最大重试次数 (${MAX_RETRY})，放弃加载沙箱: ${myUniqueName}`,
      );
      clearLoadingWatchdog();
      showLoading.value = false;
    }
  }
};

onMounted(() => {
  safeMount();
  void nextTick(syncTabTitleWithMenu);
});

onActivated(() => {
  safeMount();
  void nextTick(syncTabTitleWithMenu);
});

onDeactivated(() => {
  clearLoadingWatchdog();
  // 视图切换时主动卸载 DOM，规避 Vue 路由切换动画可能导致的白屏或渲染残留
  renderWujie.value = false;
});

// 内存管理：【按需销毁与无界实例释放】
onBeforeUnmount(() => {
  clearLoadingWatchdog();
  // 延迟 150ms，确保 Vben 框架的 tabbarStore 状态已完成异步更新
  setTimeout(() => {
    const tabs = tabbarStore.getTabs || [];

    // 校验组件初始绑定的路径 (myPath) 是否仍存在于当前的页签列表中
    const stillExists = tabs.some(
      (tab: any) => tab.fullPath === myPath || tab.path === myPath,
    );

    if (stillExists) {
      // 若仍在页签列表中，说明仅是 Vue 路由正常切换导致的组件卸载
      // 保留无界实例，等待下次 keep-alive 唤醒
      console.warn(` [保护沙箱] 壳子被卸载，但页签仍在: ${myUniqueName}`);
    } else {
      // 若不在页签列表中，说明用户主动关闭了该标签页 (Tag)
      // 此时执行彻底销毁，清空无界缓存，释放内存
      destroyApp(myUniqueName);
    }
  }, 150);
});

const handleWujieError = (url: string, e: Error) => {
  console.error(`🔴 [无界内部加载/执行失败] ${url}`, e);
  clearLoadingWatchdog();
  // 抛出异常，进入 safeMount 或被其他重试机制捕获
  // 或者直接在这里触发重试逻辑
  if (retryCount.value < MAX_RETRY) {
    retryCount.value++;
    destroyApp(myUniqueName);
    showLoading.value = true;
    renderWujie.value = false;
    setTimeout(safeMount, 300);
  } else {
    showLoading.value = false;
  }
};
</script>

<template>
  <div class="size-full overflow-hidden bg-background">
    <WujieVue
      v-if="renderWujie && microUrl"
      width="100%"
      height="calc(100vh - var(--vben-header-height, 0px))"
      :name="myUniqueName"
      :url="microUrl"
      :props="microProps"
      :sync="false"
      :alive="true"
      :after-mount="finishLoadingState"
      :activated="finishLoadingState"
      :load-error="handleWujieError"
      :exec-error="handleWujieError"
    />
    <div
      v-else-if="!microUrl"
      class="absolute inset-0 z-40 flex-center bg-background text-sm text-muted-foreground"
    >
      子应用配置缺失，无法加载当前页面
    </div>
    <transition name="fade">
      <div
        v-if="showLoading"
        class="absolute inset-0 z-50 flex-center bg-background text-muted-foreground/50"
      >
        <span class="animate-pulse">Loading...</span>
      </div>
    </transition>
  </div>
</template>
<style scoped>
/* 定义淡出动画：平滑过渡，掩盖样式切换生硬感 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
