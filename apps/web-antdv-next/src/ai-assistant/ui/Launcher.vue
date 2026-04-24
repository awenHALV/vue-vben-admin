<script setup lang="ts">
import { h } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { App } from 'antdv-next';
import { storeToRefs } from 'pinia';

import { useAiAssistantChatStore } from '#/store/chat';

import { AI_ASSISTANT_ICON_URL } from '../ai-assets';
import Drawer from './Drawer.vue';
import Fullscreen from './Fullscreen.vue';

defineOptions({
  name: 'Launcher',
});

const { modal } = App.useApp();

const chatStore = useAiAssistantChatStore();
const {
  activeConversationId,
  assistantMetaById,
  chatMessages,
  historyItems,
  historySessionsLoading,
  open,
  panelMode,
  pending,
  title,
  viewMode,
} = storeToRefs(chatStore);

function handleOpen() {
  chatStore.openPanel();
}

function handleClose() {
  chatStore.closePanel();
}

function handleNewChat() {
  chatStore.newChat();
}

function handleToggleView() {
  chatStore.toggleView();
}

function handleOpenHistory() {
  chatStore.openHistory();
}

function handleGoChat() {
  chatStore.goChat();
}

async function handleSelectConversation(id: string) {
  await chatStore.selectConversation(id);
}

async function handleSendMessage(text: string) {
  await chatStore.sendMessage(text);
}

function handleToggleThinking(messageId: string) {
  chatStore.toggleThinking(messageId);
}

function handleFeedback(payload: {
  messageId: string;
  type: 'dislike' | 'like';
}) {
  void chatStore.submitFeedback(payload);
}

async function handleDeleteConversation(id: string) {
  const ok = await new Promise<boolean>((resolve) => {
    modal.confirm({
      cancelText: '取消',
      content: '删除后，聊天记录将不可恢复。',
      okText: '删除',
      icon: h(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            marginRight: '12px',
          },
        },
        [
          h(IconifyIcon, {
            icon: 'ant-design:exclamation-circle-filled',
            style: { color: '#FF4D4F', fontSize: '22px' },
          }),
        ],
      ),
      onCancel: () => resolve(false),
      onOk: () => resolve(true),
      title: '确认删除？',
    });
  });
  if (!ok) return;
  await chatStore.deleteConversation(id);
}
</script>

<template>
  <button
    class="fixed right-[17px] bottom-[55px] z-50 flex-center size-12 cursor-pointer rounded-full border border-solid border-[#D9D9D9] bg-white p-0 shadow-[0px_4px_16px_rgba(0,0,0,0.16)] outline-none select-none dark:border-[#2B2B2B] dark:bg-[#0B0B0B]"
    type="button"
    aria-label="打开小曦助手"
    @click="handleOpen"
  >
    <!-- prettier-ignore -->
    <img
      alt="AI"
      class="size-7"
      :src="AI_ASSISTANT_ICON_URL"
    />
  </button>

  <Drawer
    v-if="open && viewMode === 'right'"
    :open="open"
    :title="title"
    :panel-mode="panelMode"
    :active-conversation-id="activeConversationId"
    :assistant-meta-by-id="assistantMetaById"
    :history-items="historyItems"
    :history-loading="historySessionsLoading"
    :messages="chatMessages"
    :pending="pending"
    @close="handleClose"
    @new-chat="handleNewChat"
    @toggle-view="handleToggleView"
    @open-history="handleOpenHistory"
    @go-chat="handleGoChat"
    @select-conversation="handleSelectConversation"
    @delete-conversation="handleDeleteConversation"
    @send-message="handleSendMessage"
    @toggle-thinking="handleToggleThinking"
    @feedback="handleFeedback"
  />
  <Fullscreen
    v-else-if="open && viewMode === 'full'"
    :open="open"
    :title="title"
    :panel-mode="panelMode"
    :active-conversation-id="activeConversationId"
    :assistant-meta-by-id="assistantMetaById"
    :history-items="historyItems"
    :history-loading="historySessionsLoading"
    :messages="chatMessages"
    :pending="pending"
    @close="handleClose"
    @new-chat="handleNewChat"
    @toggle-view="handleToggleView"
    @open-history="handleOpenHistory"
    @go-chat="handleGoChat"
    @select-conversation="handleSelectConversation"
    @delete-conversation="handleDeleteConversation"
    @send-message="handleSendMessage"
    @toggle-thinking="handleToggleThinking"
    @feedback="handleFeedback"
  />
</template>
