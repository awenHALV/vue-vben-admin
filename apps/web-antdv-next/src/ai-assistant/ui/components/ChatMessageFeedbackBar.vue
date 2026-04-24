<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'antdv-next';

defineOptions({
  name: 'ChatMessageFeedbackBar',
});

const props = defineProps<{
  modelValue?: 'dislike' | 'like' | null;
}>();

const emit = defineEmits<{
  (e: 'feedback', type: 'dislike' | 'like'): void;
}>();

function onPick(type: 'dislike' | 'like') {
  emit('feedback', type);
}
</script>

<template>
  <div
    class="mt-1 flex justify-start gap-2 opacity-0 transition-opacity group-hover:opacity-100"
  >
    <Tooltip title="赞成">
      <button
        class="flex-center size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        :class="props.modelValue === 'like' ? 'text-foreground' : ''"
        type="button"
        aria-label="赞成"
        @click="onPick('like')"
      >
        <IconifyIcon class="size-4" icon="lucide:thumbs-up" />
      </button>
    </Tooltip>

    <Tooltip title="不赞成">
      <button
        class="flex-center size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        :class="props.modelValue === 'dislike' ? 'text-foreground' : ''"
        type="button"
        aria-label="不赞成"
        @click="onPick('dislike')"
      >
        <IconifyIcon class="size-4" icon="lucide:thumbs-down" />
      </button>
    </Tooltip>
  </div>
</template>
