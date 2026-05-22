<script setup lang="ts">
import type { AssistantMessageMeta } from '@/store/chat';

import type { AiAssistantHistoryItem, AiChatMessage } from '../types';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Spin } from 'antdv-next';

import { getChatAgentsApi } from '#/api/chat';

import { AI_ASSISTANT_ICON_URL, LINGXI_AGENT_ICON_URL } from '../ai-assets';
import AiHistoryIcon from './components/AiHistoryIcon.vue';
import Avatar from './components/Avatar.vue';
import ChatPanel from './components/ChatPanel.vue';
import ComposerFooter from './components/ComposerFooter.vue';
import HeaderActions from './components/HeaderActions.vue';
import HistoryPanel from './components/HistoryPanel.vue';

defineOptions({
  name: 'Fullscreen',
});

const props = defineProps<{
  activeAgent: string;
  activeConversationFromHistory?: boolean;
  activeConversationId: null | string;
  agentProfileLoading?: boolean;
  agentQuestionsById?: Record<string, string[]>;
  agentWelcomeById?: Record<string, string>;
  assistantMetaById?: Record<string, AssistantMessageMeta>;
  historyItems: AiAssistantHistoryItem[];
  historyLoading?: boolean;
  messages?: AiChatMessage[];
  open: boolean;
  panelMode: 'chat' | 'history';
  pending?: boolean;
  restoring?: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
  deleteConversation: [id: string];
  feedback: [payload: { messageId: string; type: 'dislike' | 'like' | null }];
  goChat: [];
  newChat: [];
  openHistory: [];
  selectAgent: [agentId: string];
  selectConversation: [id: string];
  sendMessage: [text: string];
  toggleThinking: [messageId: string];
  toggleView: [];
}>();

const isViewingHistoryConversation = computed(
  () =>
    props.panelMode === 'chat' && Boolean(props.activeConversationFromHistory),
);
const hasUserMessage = computed(() =>
  Boolean(props.messages?.some((msg) => msg.role === 'user')),
);
const showAgentRecommendation = computed(
  () => props.panelMode === 'chat' && !hasUserMessage.value,
);

const agentWelcomeMessage = computed(
  () => props.agentWelcomeById?.[props.activeAgent] ?? '',
);

const recommendedQuestions = computed(
  () => props.agentQuestionsById?.[props.activeAgent] ?? [],
);

const assistantIconSrcByAgentId: Record<string, string> = {
  'ops-monitor': AI_ASSISTANT_ICON_URL,
  'power-trade': LINGXI_AGENT_ICON_URL,
};

const activeAgentIconSrc = computed(
  () => assistantIconSrcByAgentId[props.activeAgent] ?? AI_ASSISTANT_ICON_URL,
);

interface AgentItem {
  agentId: string;
  name: string;
}

const agents = ref<AgentItem[]>([]);

async function loadAgents() {
  try {
    const list = await getChatAgentsApi();
    agents.value = (Array.isArray(list) ? list : []).map((item) => ({
      agentId: item.agentId,
      name: item.name,
    }));
  } catch (error) {
    console.error('加载 Agent 列表失败:', error);
  }
}

const activeAgentName = computed(
  () =>
    agents.value.find((agent) => agent.agentId === props.activeAgent)?.name ??
    props.title,
);

function isAgentSelected(agentId: string) {
  return props.activeAgent === agentId && props.panelMode === 'chat';
}

onMounted(() => {
  void loadAgents();
});
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-6 z-1000 flex overflow-hidden rounded-xl bg-background shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
  >
    <div
      class="flex w-64 shrink-0 flex-col border-r border-border bg-[#FAFAFA] dark:bg-black"
    >
      <div
        class="flex h-12 items-center justify-between border-b border-border px-4"
      >
        <div class="text-sm font-medium text-foreground">能源智能体</div>
      </div>
      <div class="space-y-2 p-2">
        <div
          v-for="agent in agents"
          :key="agent.agentId"
          class="flex h-[38px] w-full cursor-pointer items-center justify-start gap-2 rounded-lg px-3 text-left transition-colors hover:bg-white dark:hover:bg-accent"
          :class="
            isAgentSelected(agent.agentId) ? 'bg-white dark:bg-accent' : ''
          "
          role="button"
          tabindex="0"
          :aria-label="agent.name"
          :aria-pressed="isAgentSelected(agent.agentId)"
          @click="emit('selectAgent', agent.agentId)"
          @keydown.enter.prevent="emit('selectAgent', agent.agentId)"
          @keydown.space.prevent="emit('selectAgent', agent.agentId)"
        >
          <img
            v-if="agent.agentId === 'power-trade'"
            :alt="agent.name"
            class="size-6 shrink-0"
            :src="LINGXI_AGENT_ICON_URL"
          />
          <Avatar v-else class="mt-0! size-6!"
img-class="size-4" />
          <span class="text-sm text-foreground">{{ agent.name }}</span>
        </div>
      </div>

      <div class="mt-auto p-2">
        <div
          class="mb-12 flex w-full cursor-pointer items-center justify-center! gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
          role="button"
          tabindex="0"
          aria-label="历史记录"
          @click="emit('openHistory')"
          @keydown.enter.prevent="emit('openHistory')"
        >
          <AiHistoryIcon size-class="size-4" />
          <span class="text-sm text-foreground">历史记录</span>
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <div
        class="flex h-12 items-center justify-between border-b border-border px-4"
      >
        <button
          v-if="isViewingHistoryConversation"
          class="flex min-w-0 items-center gap-1 rounded-md p-0 text-sm font-medium text-foreground hover:text-foreground/80"
          type="button"
          aria-label="返回历史记录列表"
          @click="emit('openHistory')"
        >
          <IconifyIcon class="size-4 shrink-0" icon="lucide:chevron-left" />
          <span class="truncate">历史对话</span>
        </button>
        <div v-else class="truncate text-sm font-medium text-foreground">
          {{ activeAgentName }}
        </div>

        <HeaderActions
          :panel-mode="props.panelMode"
          gap-class="gap-1"
          toggle-icon="lucide:minimize-2"
          @close="emit('close')"
          @new-chat="emit('newChat')"
          @toggle-view="emit('toggleView')"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <HistoryPanel
          v-if="props.panelMode === 'history'"
          variant="fullscreen"
          :history-items="props.historyItems"
          :history-loading="props.historyLoading"
          @delete-conversation="emit('deleteConversation', $event)"
          @select-conversation="emit('selectConversation', $event)"
        />

        <!-- eslint-disable-next-line vue/max-attributes-per-line -->
        <Spin v-else :spinning="Boolean(props.restoring)" class="block w-full">
          <div
            v-if="props.restoring"
            aria-hidden="true"
            class="min-h-[min(360px,55vh)] w-full shrink-0"
          ></div>

          <div v-else class="mx-auto w-[800px] p-4">
            <div v-if="showAgentRecommendation" class="flex items-start gap-3">
              <img alt="" class="size-8 shrink-0"
:src="activeAgentIconSrc" />
              <div class="min-w-0 flex-1">
                <div
                  v-if="props.agentProfileLoading"
                  class="flex min-h-8 items-center text-sm leading-[22px] text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
                >
                  加载中...
                </div>
                <div
                  v-else
                  class="flex min-h-8 items-center text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-foreground"
                >
                  {{ agentWelcomeMessage }}
                </div>

                <div
                  v-if="recommendedQuestions.length > 0"
                  class="mt-[7px] max-w-[400px] rounded-lg border border-[#F0F0F0] bg-white px-4 py-3 dark:border-border dark:bg-card"
                >
                  <div
                    class="mb-1 text-xs/5 text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
                  >
                    为您推荐
                  </div>
                  <div class="flex flex-col gap-2">
                    <button
                      v-for="question in recommendedQuestions"
                      :key="question"
                      class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left text-sm leading-[22px] text-[rgba(0,0,0,0.88)] transition-colors hover:text-primary dark:text-foreground dark:hover:text-primary"
                      type="button"
                      @click="emit('sendMessage', question)"
                    >
                      <span class="min-w-0 truncate">{{ question }}</span>
                      <IconifyIcon
                        class="size-4 shrink-0"
                        icon="lucide:chevron-right"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <ChatPanel
              v-else
              variant="fullscreen"
              :active-conversation-id="props.activeConversationId"
              :active-agent="props.activeAgent"
              :assistant-meta-by-id="props.assistantMetaById"
              :messages="props.messages"
              @toggle-thinking="emit('toggleThinking', $event)"
              @feedback="emit('feedback', $event)"
            />
          </div>
        </Spin>
      </div>
      <div v-if="props.panelMode !== 'history'" class="mx-auto w-[800px] p-4">
        <ComposerFooter
          :pending="props.pending"
          @submit="emit('sendMessage', $event)"
        />
      </div>
    </div>
  </div>
</template>
