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
  <div class="size-full p-4">
    <!-- sync 关闭：基座已通过 meta.microUrl 指定子应用完整地址，避免与 vue-router 冲突；且 wujie 1.0.29 在刷新时序下 sync 可能早于 __WUJIE 注入导致报错 -->
    <WujieVue
      v-if="microUrl"
      width="100%"
      height="100%"
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
