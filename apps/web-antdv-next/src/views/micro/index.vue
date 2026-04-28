<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useTabs } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import WujieVue from 'wujie-vue3';

import { buildMicroUrl } from '#/wujie-config/micro-route';

const route = useRoute();
const accessStore = useAccessStore();
const { setTabTitle } = useTabs();

// ==========================================
// 🌟 核心机制：【实例路径锁定】
// 在 setup 初始化时固化当前路径，避免使用 computed 响应式追踪。
// 确保无论外部路由如何跳转，当前微应用容器始终与其首次挂载的路径强绑定，
// 从而有效解决多开同名微应用时的状态混淆问题。
// ==========================================
const myPath = route.fullPath;
const baseName = (route.meta.microName as string) || 'default-app';
const myUniqueName = `${baseName}-${myPath}`;

function getQueryValue(value: unknown): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  return typeof value === 'string' ? value : '';
}

/** 子应用完整 URL（env 域名 + 子应用内 path），动态路由使用当前 host 实际路径，避免落回 /:id 模板路径 */
const microUrl = computed(() => {
  const baseUrl = buildMicroUrl(microName.value, route.path);
  if (!baseUrl) {
    return route.meta.microUrl as string | undefined;
  }
  const extra = route.fullPath.startsWith(route.path)
    ? route.fullPath.slice(route.path.length)
    : '';
  return `${baseUrl}${extra}`;
});

const microProps = computed(() => ({
  token: accessStore.accessToken ?? '',
}));

watch(
  () => route.fullPath,
  () => {
    const dynamicTitle = getQueryValue(route.query.tabTitle) || getQueryValue(route.query.name);
    if (dynamicTitle) {
      void setTabTitle(dynamicTitle);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="size-full">
    <!--
      sync：false，由 host 当前实际路由驱动子应用地址，避免动态路由退回到 /:id 模板路径。
      key：仅用 microName。同应用切换菜单只变 microUrl；setupApp.alive 须为 false，否则 wujie 不应用新 url。
      若 key 含 microUrl 可强制重挂载，但与 alive=false 重复、且每次整 iframe 冷启成本更高。
    -->
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

    <div v-else class="flex h-full w-full items-center justify-center text-muted-foreground/50">
      <span class="animate-pulse">Loading...</span>
    </div>
  </div>
</template>
