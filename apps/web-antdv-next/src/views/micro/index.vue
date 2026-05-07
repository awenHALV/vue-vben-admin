<script setup lang="ts">
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
} from 'vue';
import { useRoute } from 'vue-router';

import { useAccessStore, useTabbarStore } from '@vben/stores';

import WujieVue from 'wujie-vue3';

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
const baseName = (route.meta.microName as string) || 'default-app';
// 用于无界实例隔离：将 fullPath 纳入唯一标识，避免 alive=true 时复用旧实例/旧 url
const myUniqueName = `${baseName}-${myPath}`;

function resolveMicroUrl() {
  /**
   * 菜单路由由后端下发时，会在 `meta.microUrl` 写入完整子应用 URL（域名 + 子路径）。
   * 但「详情页 / 动态路由」往往不在菜单内，主应用只会命中 `/vpp/:pathMatch(.*)*` 这类通配容器路由，
   * 此时没有 `meta.microUrl`，需要根据当前地址栏的 `route.fullPath` 动态推导。
   */
  const url = route.meta.microUrl as string | undefined;
  if (url) {
    return url;
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

// ==========================================
// 🛡️ 渲染控制：【防白屏与生命周期管理】
// ==========================================
const renderWujie = ref(false);

const safeMount = () => {
  setTimeout(() => {
    renderWujie.value = true;
  }, 100);
};

onMounted(() => {
  safeMount();
});

onActivated(() => {
  safeMount();
});

onDeactivated(() => {
  // 视图切换时主动卸载 DOM，规避 Vue 路由切换动画可能导致的白屏或渲染残留
  renderWujie.value = false;
});

// ==========================================
// 🛡️ 内存管理：【按需销毁与无界实例释放】
// ==========================================
onBeforeUnmount(() => {
  // 延迟 150ms，确保 Vben 框架的 tabbarStore 状态已完成异步更新
  setTimeout(() => {
    const tabs = tabbarStore.getTabs || [];

    // 校验组件初始绑定的路径 (myPath) 是否仍存在于当前的页签列表中
    const stillExists = tabs.some(
      (tab: any) => tab.fullPath === myPath || tab.path === myPath,
    );

    if (!stillExists) {
      // 若不在页签列表中，说明用户主动关闭了该标签页 (Tag)
      // 此时执行彻底销毁，清空无界缓存，释放内存
      destroyApp(myUniqueName);
    }
  }, 150);
});
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
    />

    <div v-else class="flex-center size-full text-muted-foreground/50">
      <span class="animate-pulse">Loading Sandbox...</span>
    </div>
  </div>
</template>
