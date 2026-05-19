<script setup lang="ts">
import type {
  AiAssistantHistoryItem,
  AiAssistantPanelVariant,
} from '../../types';

import HistoryItemTimeArea from './HistoryItemTimeArea.vue';
import HistoryItemUserArea from './HistoryItemUserArea.vue';

defineOptions({
  name: 'HistoryListItem',
});

const props = defineProps<{
  formattedTime: string;
  item: AiAssistantHistoryItem;
  variant: AiAssistantPanelVariant;
}>();

const emit = defineEmits<{
  delete: [id: string];
  select: [id: string];
}>();
</script>

<template>
  <div
    :class="
      props.variant === 'fullscreen'
        ? 'group w-full cursor-pointer rounded-lg bg-card p-2 transition-colors hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-accent'
        : 'group w-full cursor-pointer rounded-lg bg-white p-2 transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:bg-card dark:hover:bg-accent'
    "
    role="button"
    tabindex="0"
    @click="emit('select', props.item.id)"
    @keydown.enter.prevent="emit('select', props.item.id)"
  >
    <div class="flex w-full min-w-0 items-center gap-3">
      <div class="min-w-0 flex-1 self-center">
        <div
          class="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_0px] gap-y-1 group-hover:grid-cols-[minmax(0,1fr)_32px]"
        >
          <HistoryItemUserArea
            :item-id="props.item.id"
            :preview="props.item.preview"
            :variant="props.variant"
            @delete="emit('delete', $event)"
          />

          <HistoryItemTimeArea
            :agent-name="props.item.agentName"
            :formatted-time="props.formattedTime"
            :variant="props.variant"
          />
        </div>
      </div>
    </div>
  </div>
</template>
