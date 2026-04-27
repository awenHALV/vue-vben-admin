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
const myUniqueName = `${baseName}-${myPath}`;

const microUrl = route.meta.microUrl as string | undefined;
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

    if (stillExists) {
      // 若仍在页签列表中，说明仅是 Vue 路由正常切换导致的组件卸载
      // 保留无界实例，等待下次 keep-alive 唤醒
      console.log(`�️ [保护沙箱] 壳子被卸载，但页签仍在: ${myUniqueName}`);
    } else {
      // 若不在页签列表中，说明用户主动关闭了该标签页 (Tag)
      // 此时执行彻底销毁，清空无界缓存，释放内存
      console.log(`� [彻底销毁] 页签已关闭，清空无界内存: ${myUniqueName}`);
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
