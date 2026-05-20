<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getChatAgentsApi } from '#/api/chat';

import { AI_ASSISTANT_ICON_URL, LINGXI_AGENT_ICON_URL } from '../../ai-assets';
import AiHistoryIcon from './AiHistoryIcon.vue';
import IconChip from './IconChip.vue';

defineOptions({
  name: 'DrawerSideToolbar',
});

defineProps<{
  activeAgent: string;
  panelMode: 'chat' | 'history';
}>();

const emit = defineEmits<{
  goChat: [];
  openHistory: [];
  selectAgent: [agentId: string];
}>();

// Agent 列表数据
interface AgentItem {
  agentId: string;
  name: string;
}

const agents = ref<AgentItem[]>([]);

// 获取 Agent 列表
async function loadAgents() {
  try {
    const res = await getChatAgentsApi();
    agents.value = res.map((item) => ({
      agentId: item.agentId,
      name: item.name,
    }));
  } catch (error) {
    console.error('加载 Agent 列表失败:', error);
  }
}

const assistantIconSrc = {
  'ops-monitor': AI_ASSISTANT_ICON_URL,
  'power-trade': LINGXI_AGENT_ICON_URL,
};

onMounted(() => {
  void loadAgents();
});
</script>

<template>
  <div
    class="w-[60px] shrink-0 border-l border-[rgba(0,0,0,0.06)] bg-[#FAFAFA] p-2 dark:border-border dark:bg-muted/30"
  >
    <div class="flex h-full flex-col items-center gap-2">
      <!-- Agent 列表 -->
      <div
        v-for="(agent, index) in agents"
        :key="agent.agentId"
        class="flex-col-center flex cursor-pointer border-[rgba(0,0,0,0.06)] p-1 transition-[colors,box-shadow] hover:rounded-sm hover:bg-white hover:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03),0px_1px_6px_-1px_rgba(0,0,0,0.02),0px_2px_4px_0px_rgba(0,0,0,0.02)] dark:hover:bg-accent dark:hover:shadow-none"
        :class="[
          index === 0 ? 'mt-2' : '',
          activeAgent === agent.agentId && panelMode === 'chat'
            ? 'rounded-sm bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.03),0px_1px_6px_-1px_rgba(0,0,0,0.02),0px_2px_4px_0px_rgba(0,0,0,0.02)] dark:bg-accent dark:shadow-none'
            : '',
        ]"
        role="button"
        tabindex="0"
        :aria-label="agent.name"
        :aria-pressed="activeAgent === agent.agentId && panelMode === 'chat'"
        @click="emit('selectAgent', agent.agentId)"
        @keydown.enter.prevent="emit('selectAgent', agent.agentId)"
        @keydown.space.prevent="emit('selectAgent', agent.agentId)"
      >
        <div class="py-1">
          <IconChip :alt="agent.name" :src="assistantIconSrc[agent.agentId]" />
        </div>
        <span
          class="shrink-0 text-center text-[12px] leading-none whitespace-nowrap text-[rgba(0,0,0,0.88)] dark:text-foreground"
        >
          {{ agent.name }}
        </span>
      </div>

      <!-- 历史记录按钮 -->
      <div
        class="mt-auto mb-9 flex-center size-10 cursor-pointer rounded-lg border border-[rgba(0,0,0,0.06)] bg-white p-1.5 transition-colors hover:bg-[rgba(0,0,0,0.04)] dark:border-border dark:bg-[rgba(0,0,0,0.04)] dark:hover:bg-accent"
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
