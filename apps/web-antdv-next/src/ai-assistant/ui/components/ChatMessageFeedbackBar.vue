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
  (e: 'feedback', type: 'dislike' | 'like'): void;
}>();

const likeDisabled = computed(() => props.modelValue === 'like');
const dislikeDisabled = computed(() => props.modelValue === 'dislike');

const likeTooltip = computed(() => (likeDisabled.value ? '已赞成' : '赞成'));
const dislikeTooltip = computed(() =>
  dislikeDisabled.value ? '已反馈不赞成' : '不赞成',
);

function onPick(type: 'dislike' | 'like') {
  if (type === 'like' && likeDisabled.value) return;
  if (type === 'dislike' && dislikeDisabled.value) return;
  emit('feedback', type);
}
</script>

<template>
  <div
    class="flex justify-start gap-2 opacity-0 transition-opacity group-hover:opacity-100"
  >
    <Tooltip :title="likeTooltip">
      <span class="inline-flex">
        <button
          class="flex-center size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
          :class="[
            props.modelValue === 'like' ? 'text-foreground' : '',
            likeDisabled ? '' : 'cursor-pointer',
          ]"
          :disabled="likeDisabled"
          type="button"
          aria-label="赞成"
          @click="onPick('like')"
        >
          <IconifyIcon class="size-4" icon="lucide:thumbs-up" />
        </button>
      </span>
    </Tooltip>

    <Tooltip :title="dislikeTooltip">
      <span class="inline-flex">
        <button
          class="flex-center size-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
          :class="[
            props.modelValue === 'dislike' ? 'text-foreground' : '',
            dislikeDisabled ? '' : 'cursor-pointer',
          ]"
          :disabled="dislikeDisabled"
          type="button"
          aria-label="不赞成"
          @click="onPick('dislike')"
        >
          <IconifyIcon class="size-4" icon="lucide:thumbs-down" />
        </button>
      </span>
    </Tooltip>
  </div>
</template>
