<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import WujieVue from 'wujie-vue3';

const route = useRoute();
const accessStore = useAccessStore();

/** 与 website.projectCodes 一致，对应 Wujie 子应用 name */
const microName = computed(
  () => (route.meta.microName as string) || 'default-app',
);

/** 子应用完整 URL（env 域名 + 子应用内 path，已去掉基座 /{featureCode} 前缀） */
const microUrl = computed(() => route.meta.microUrl as string | undefined);

const microProps = computed(() => ({
  token: accessStore.accessToken ?? '',
}));
</script>

<template>
  <div class="size-full">
    <!--
      sync：false，由 meta.microUrl 驱动子应用地址，避免与基座 vue-router 双写冲突。
      key：仅用 microName。同应用切换菜单只变 microUrl；setupApp.alive 须为 false，否则 wujie 不应用新 url。
      若 key 含 microUrl 可强制重挂载，但与 alive=false 重复、且每次整 iframe 冷启成本更高。
    -->
    <WujieVue
      v-if="microUrl"
      :key="String(microName)"
      width="100%"
      height="calc(100vh - 96px)"
      :name="microName"
      :url="microUrl"
      :props="microProps"
      :sync="false"
    />
    <!-- eslint-disable-next-line vue/max-attributes-per-line -->
    <div v-else class="text-muted-foreground">
      子应用配置错误：未生成 microUrl（请检查 VITE_APP_* 与子应用 routePath）
    </div>
  </div>
</template>
