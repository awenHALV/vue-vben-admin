<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import WujieVue from 'wujie-vue3';

const route = useRoute();

// 从路由元数据 meta 中获取动态配置
const microName = computed(
  () => (route.meta.microName as string) || 'default-app',
);
const microUrl = computed(() => route.meta.microUrl as string);
</script>

<template>
  <div class="size-full p-4">
    <WujieVue
      v-if="microUrl"
      width="100%"
      height="100%"
      :name="microName"
      :url="microUrl"
      :sync="true"
    />
    <div v-else>子应用配置错误，无法加载</div>
  </div>
</template>
