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
    <WujieVue
      v-if="microUrl"
      width="100%"
      height="100%"
      :name="microName"
      :url="microUrl"
      :props="microProps"
      :sync="true"
    />
    <!-- eslint-disable-next-line vue/max-attributes-per-line -->
    <div v-else class="text-muted-foreground">
      子应用配置错误：未生成 microUrl（请检查 VITE_APP_* 与子应用 routePath）
    </div>
  </div>
</template>
