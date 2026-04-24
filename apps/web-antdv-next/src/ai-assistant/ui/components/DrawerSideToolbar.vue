<script setup lang="ts">
import { AI_ASSISTANT_ICON_URL } from '../../ai-assets';
import AiHistoryIcon from './AiHistoryIcon.vue';
import IconChip from './IconChip.vue';

defineOptions({
  name: 'DrawerSideToolbar',
});

defineProps<{
  panelMode: 'chat' | 'history';
}>();

const emit = defineEmits<{
  goChat: [];
  openHistory: [];
}>();

const assistantIconSrc = AI_ASSISTANT_ICON_URL;
</script>

<template>
  <div
    class="w-[84px] shrink-0 border-l border-[rgba(0,0,0,0.06)] bg-[#FAFAFA] p-2 dark:border-border dark:bg-muted/30"
  >
    <div class="flex h-full flex-col items-center gap-2">
      <div
        class="mt-2 flex-col-center flex cursor-pointer border-[rgba(0,0,0,0.06)] p-2 transition-[colors,box-shadow] hover:rounded-sm hover:bg-white hover:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03),0px_1px_6px_-1px_rgba(0,0,0,0.02),0px_2px_4px_0px_rgba(0,0,0,0.02)] dark:hover:bg-accent dark:hover:shadow-none"
        type="text"
        aria-label="小曦助手"
        @click="emit('goChat')"
      >
        <div class="py-1">
          <IconChip alt="AI" :src="assistantIconSrc" />
        </div>
        <span
          class="shrink-0 text-center text-[12px] leading-none whitespace-nowrap text-[rgba(0,0,0,0.88)] dark:text-foreground"
        >
          小曦助手
        </span>
      </div>

      <!-- <Button
        class="mt-auto flex-center size-auto w-[40px] rounded-lg border-l bg-transparent p-2 transition-all hover:bg-[rgba(0,0,0,0.04)]"
        type="text"
        aria-label="历史对话"
        @click="emit('openHistory')"
      >
        <img
          alt="历史记录"
          :src="historyIconSrc"
        />
      </Button> -->
      <div
        class="mt-auto flex-center size-10 cursor-pointer rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-1.5 transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:border-border dark:bg-[rgba(0,0,0,0.04)] dark:hover:bg-accent"
        role="button"
        tabindex="0"
        aria-label="历史记录"
        @click="emit('openHistory')"
        @keydown.enter.prevent="emit('openHistory')"
      >
        <AiHistoryIcon />
      </div>
    </div>
  </div>
</template>
