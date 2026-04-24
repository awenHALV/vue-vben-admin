<script setup lang="ts">
import aiHistorySvgMarkup from '../../assets/ai-history.svg?raw';

defineOptions({
  name: 'AiHistoryIcon',
});

withDefaults(
  defineProps<{
    /** 例如 size-4、size-5.5，与原先图标占位一致 */
    sizeClass?: string;
  }>(),
  {
    sizeClass: 'size-5.5',
  },
);
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- 构建时内联的本地 ai-history.svg，非用户输入 -->
  <span
    class="inline-flex shrink-0 text-[#6A6A6A] dark:text-[#DCDCDC] [&_svg]:block [&_svg]:size-full"
    :class="sizeClass"
    aria-hidden="true"
    v-html="aiHistorySvgMarkup"
  ></span>
</template>
