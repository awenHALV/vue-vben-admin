<script setup lang="ts">
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Tooltip } from 'antdv-next';

defineOptions({
  name: 'ChatMessageFeedbackBar',
});

const props = defineProps<{
  modelValue?: 'dislike' | 'like' | null;
}>();

const emit = defineEmits<{
  (e: 'feedback', type: 'dislike' | 'like' | null): void;
}>();

const liked = computed(() => props.modelValue === 'like');
const disliked = computed(() => props.modelValue === 'dislike');

const likeTooltip = computed(() => (liked.value ? '取消赞成' : '赞成'));
const dislikeTooltip = computed(() =>
  disliked.value ? '取消不赞成' : '不赞成',
);

function onPick(type: 'dislike' | 'like') {
  if (type === 'like') {
    emit('feedback', liked.value ? null : 'like');
    return;
  }
  emit('feedback', disliked.value ? null : 'dislike');
}
</script>

<template>
  <div
    class="flex justify-start gap-2 opacity-0 transition-opacity group-hover:opacity-100"
  >
    <Tooltip :title="likeTooltip">
      <span class="inline-flex">
        <button
          class="flex-center size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          :class="[props.modelValue === 'like' ? 'text-foreground' : '']"
          type="button"
          aria-label="赞成"
          @click="onPick('like')"
        >
          <IconifyIcon
            class="size-4"
            :icon="liked ? 'mdi:thumb-up' : 'mdi:thumb-up-outline'"
          />
        </button>
      </span>
    </Tooltip>

    <Tooltip :title="dislikeTooltip">
      <span class="inline-flex">
        <button
          class="flex-center size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          :class="[props.modelValue === 'dislike' ? 'text-foreground' : '']"
          type="button"
          aria-label="不赞成"
          @click="onPick('dislike')"
        >
          <IconifyIcon
            class="size-4"
            :icon="disliked ? 'mdi:thumb-down' : 'mdi:thumb-down-outline'"
          />
        </button>
      </span>
    </Tooltip>
  </div>
</template>
