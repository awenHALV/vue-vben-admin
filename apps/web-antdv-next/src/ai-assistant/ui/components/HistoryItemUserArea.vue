<script setup lang="ts">
import type { AiAssistantPanelVariant } from '../../types';

import { IconifyIcon } from '@vben/icons';

defineOptions({
  name: 'HistoryItemUserArea',
});

const props = defineProps<{
  itemId: string;
  preview: string;
  variant: AiAssistantPanelVariant;
}>();

const emit = defineEmits<{
  delete: [id: string];
}>();
</script>

<template>
  <!-- 用户区：首条消息预览 + 行内删除 -->
  <div
    :class="
      props.variant === 'fullscreen'
        ? 'h-[22px] truncate text-left text-sm/tight'
        : 'h-[22px] truncate text-left text-sm/tight text-[rgba(0,0,0,0.88)] dark:text-foreground'
    "
  >
    {{ props.preview }}
  </div>

  <div class="flex justify-end overflow-hidden">
    <div
      class="inline-flex size-8 cursor-pointer items-center justify-center rounded-md opacity-0 transition-[opacity,background-color] group-hover:opacity-100 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-accent"
      role="button"
      tabindex="0"
      aria-label="删除"
      @click.stop="emit('delete', props.itemId)"
      @keydown.enter.stop.prevent="emit('delete', props.itemId)"
    >
      <IconifyIcon
        :class="
          props.variant === 'fullscreen'
            ? 'size-4 text-muted-foreground'
            : 'size-4 text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
        "
        icon="lucide:trash-2"
      />
    </div>
  </div>
</template>
