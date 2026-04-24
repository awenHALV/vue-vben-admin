<script setup lang="ts">
import { AI_ASSISTANT_ICON_URL } from '../../ai-assets';

defineOptions({
  name: 'Avatar',
});

const assistantIconAttrs = {
  alt: 'AI',
  src: AI_ASSISTANT_ICON_URL,
} as const;
</script>

<template>
  <div
    class="mt-0.5 flex-center size-8 shrink-0 overflow-hidden rounded-full border border-[#D9D9D9] bg-white dark:border-[#3B3D40] dark:bg-[#2E3033]"
  >
    <img class="size-[18px] object-cover" v-bind="assistantIconAttrs" />
  </div>
</template>
