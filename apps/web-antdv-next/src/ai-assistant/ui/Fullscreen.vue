<script setup lang="ts">
import type { AssistantMessageMeta } from '@/store/chat';

import type { AiAssistantHistoryItem, AiChatMessage } from '../types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Spin } from 'antdv-next';

import { AI_ASSISTANT_ICON_URL } from '../ai-assets';
import AiHistoryIcon from './components/AiHistoryIcon.vue';
import ChatPanel from './components/ChatPanel.vue';
import ComposerFooter from './components/ComposerFooter.vue';
import HeaderActions from './components/HeaderActions.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import IconChip from './components/IconChip.vue';

defineOptions({
  name: 'Fullscreen',
});

const props = defineProps<{
  activeConversationFromHistory?: boolean;
  activeConversationId: null | string;
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
  selectConversation: [id: string];
  sendMessage: [text: string];
  toggleThinking: [messageId: string];
  toggleView: [];
}>();

const isViewingHistoryConversation = computed(
  () =>
    props.panelMode === 'chat' && Boolean(props.activeConversationFromHistory),
);
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-6 z-1100 flex overflow-hidden rounded-xl bg-background shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
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
        <Button
          class="flex w-full items-center justify-start! gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
          type="text"
          @click="emit('goChat')"
        >
          <IconChip
            alt="AI"
            :src="AI_ASSISTANT_ICON_URL"
            frame-class="size-6"
            img-class="size-4"
          />
          <span class="text-sm text-foreground">小羲助手</span>
        </Button>
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
          {{ props.title }}
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
            class="w-full shrink-0"
          ></div>

          <div v-else class="mx-auto w-[800px] p-4">
            <ChatPanel
              variant="fullscreen"
              :active-conversation-id="props.activeConversationId"
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
