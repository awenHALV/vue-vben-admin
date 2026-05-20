<script setup lang="ts">
import type { AiAssistantPanelVariant } from '../../types';

defineOptions({
  name: 'HistoryItemTimeArea',
});

const props = defineProps<{
  agentName: string;
  formattedTime: string;
  variant: AiAssistantPanelVariant;
}>();
</script>

<template>
  <!-- 助手区/元信息：相对时间或日期时间 -->
  <div
    :class="
      props.variant === 'fullscreen'
        ? 'col-span-2 flex justify-between text-right text-xs/none text-muted-foreground'
        : 'col-span-2 flex justify-between text-right text-xs/none text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
    "
  >
    <div class="agent-name text-sm">{{ props.agentName }}</div>
    <div>{{ props.formattedTime }}</div>
  </div>
</template>
