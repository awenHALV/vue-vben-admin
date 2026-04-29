<script setup lang="ts">
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  nextTick,
  ref,
} from "vue";
import { useRoute } from "vue-router";
import {
  emitChangeThemeToChildWithTab
} from "#/wujie-config/hostBridge.ts";
import { useAccessStore, useTabbarStore } from "@vben/stores";

import WujieVue from "wujie-vue3";

defineOptions({ name: "WujieWrapper" });

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
const baseName = (route.meta.microName as string) || "default-app";
const myUniqueName = `${baseName}-${myPath}`;

const microUrl = route.meta.microUrl as string | undefined;
const microProps = computed(() => ({ token: accessStore.accessToken ?? "" }));
// sleep 辅助函数，增强异步流程可读性
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 渲染控制：【防白屏 & 生命周期管理 & 兜底策略】
const renderWujie = ref(false);
const showLoading = ref(true); // 控制遮罩层是否显示（顶层）
const retryCount = ref(0); // 记录当前重试次数
const MAX_RETRY = 2; // 最大重试次数，防止无限死循环

const safeMount = async () => {
  showLoading.value = true;
  try {
    // 避免过度频繁的 DOM 抖动
    await sleep(100);

    // 挂载无界组件
    renderWujie.value = true;
    await nextTick();

    // 因为部分页面存在信息丢失的情况，所以主动通知子应用主题和语言信息
    emitChangeThemeToChildWithTab();

    // 延迟关闭 Loading 遮罩
    await sleep(150);
    showLoading.value = false;

    // 成功挂载后，重置重试次数
    retryCount.value = 0;
  } catch (error) {
    console.error(`🔴 [沙箱挂载/通信异常] ${myUniqueName}:`, error);

    // 兜底策略：强制重新加载
    if (retryCount.value < MAX_RETRY) {
      retryCount.value++;
      console.warn(
        `🔄 [触发兜底策略] 准备进行第 ${retryCount.value} 次重加载: ${myUniqueName}`
      );

      // 先重置视图状态
      showLoading.value = true;
      renderWujie.value = false;

      // 彻底销毁当前可能已损坏的无界实例
      destroyApp(myUniqueName);

      // 给一点缓冲时间后重新尝试挂载
      await sleep(300);
      await safeMount();
    } else {
      console.error(
        `❌ [致命错误] 已达到最大重试次数 (${MAX_RETRY})，放弃加载沙箱: ${myUniqueName}`
      );
      showLoading.value = false;
    }
  }
};

onMounted(() => {
  console.log(`🟢 [挂载沙箱] ${myUniqueName}`);
  safeMount();
});

onActivated(() => {
  console.log(`🌞 [唤醒沙箱] ${myUniqueName}`);
  safeMount();
});

onDeactivated(() => {
  console.log(`🌙 [沙箱休眠] ${myUniqueName}`);
  // 视图切换时主动卸载 DOM，规避 Vue 路由切换动画可能导致的白屏或渲染残留
  // renderWujie.value = false;
});

// 内存管理：【按需销毁与无界实例释放】
onBeforeUnmount(() => {
  // 延迟 150ms，确保 Vben 框架的 tabbarStore 状态已完成异步更新
  setTimeout(() => {
    const tabs = tabbarStore.getTabs || [];

    // 校验组件初始绑定的路径 (myPath) 是否仍存在于当前的页签列表中
    const stillExists = tabs.some(
      (tab: any) => tab.fullPath === myPath || tab.path === myPath
    );

    if (stillExists) {
      // 若仍在页签列表中，说明仅是 Vue 路由正常切换导致的组件卸载
      // 保留无界实例，等待下次 keep-alive 唤醒
      console.log(` [保护沙箱] 壳子被卸载，但页签仍在: ${myUniqueName}`);
    } else {
      // 若不在页签列表中，说明用户主动关闭了该标签页 (Tag)
      // 此时执行彻底销毁，清空无界缓存，释放内存
      console.log(` [彻底销毁] 页签已关闭，清空无界内存: ${myUniqueName}`);
      destroyApp(myUniqueName);
    }
  }, 150);
});

const handleWujieError = (url: string, e: Error) => {
  console.error(`🔴 [无界内部加载/执行失败] ${url}`, e);
  // 抛出异常，进入 safeMount 或被其他重试机制捕获
  // 或者直接在这里触发重试逻辑
  if (retryCount.value < MAX_RETRY) {
    retryCount.value++;
    destroyApp(myUniqueName);
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
      :loadError="handleWujieError"
      :execError="handleWujieError"
    />
    <transition name="fade">
      <div
        v-if="showLoading"
        class="absolute inset-0 z-50 flex items-center justify-center bg-background text-muted-foreground/50"
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
