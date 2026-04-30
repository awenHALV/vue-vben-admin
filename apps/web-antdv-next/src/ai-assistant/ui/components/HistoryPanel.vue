<script setup lang="ts">
import type {
  AiAssistantHistoryItem,
  AiAssistantPanelVariant,
} from '../../types';

import { Spin } from 'antdv-next';

import { formatHistoryTime } from './history-time';
import HistoryListItem from './HistoryListItem.vue';

defineOptions({
  name: 'HistoryPanel',
});

const props = withDefaults(
  defineProps<{
    historyItems: AiAssistantHistoryItem[];
    historyLoading?: boolean;
    variant?: AiAssistantPanelVariant;
  }>(),
  {
    historyLoading: false,
    variant: 'drawer',
  },
);

const emit = defineEmits<{
  deleteConversation: [id: string];
  selectConversation: [id: string];
}>();
</script>

<template>
  <div class="flex w-full flex-1 flex-col items-stretch justify-center">
    <Spin :spinning="props.historyLoading" class="block w-full">
      <div
        v-if="props.historyLoading"
        aria-hidden="true"
        class="min-h-[min(360px,55vh)] w-full shrink-0"
      ></div>

      <div
        v-else-if="props.historyItems.length === 0"
        :class="
          props.variant === 'fullscreen'
            ? 'py-10 text-center text-sm text-muted-foreground'
            : 'py-10 text-center text-sm text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
        "
      >
        无历史对话数据
      </div>

      <div
        v-else
        :class="props.variant === 'fullscreen' ? 'space-y-2 p-2' : 'space-y-3'"
      >
        <HistoryListItem
          v-for="item in props.historyItems"
          :key="item.id"
          :item="item"
          :variant="props.variant"
          :formatted-time="formatHistoryTime(item.time)"
          @delete="emit('deleteConversation', $event)"
          @select="emit('selectConversation', $event)"
        />
      </div>
    </Spin>
  </div>
</template>
