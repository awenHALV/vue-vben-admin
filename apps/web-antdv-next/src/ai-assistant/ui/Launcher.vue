<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue';

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

const LAUNCHER_SIZE = 48;
const LAUNCHER_DEFAULT_BOTTOM = 55;
const LAUNCHER_VIEWPORT_PADDING = 16;
const DRAG_CLICK_THRESHOLD = 4;

const { modal } = App.useApp();

const chatStore = useAiAssistantChatStore();
const {
  activeConversationId,
  activeConversationFromHistory,
  assistantMetaById,
  chatMessages,
  historyItems,
  historySessionsLoading,
  open,
  panelMode,
  pending,
  restoreLoading,
  title,
  viewMode,
} = storeToRefs(chatStore);

const launcherBottom = ref(LAUNCHER_DEFAULT_BOTTOM);
const dragging = ref(false);
const suppressNextClick = ref(false);
let dragStartClientY = 0;
let dragStartBottom = 0;
let dragMoved = false;

const launcherStyle = computed(() => ({
  bottom: `${launcherBottom.value}px`,
}));

function clampLauncherBottom(bottom: number) {
  const maxBottom = Math.max(
    LAUNCHER_VIEWPORT_PADDING,
    window.innerHeight - LAUNCHER_SIZE - LAUNCHER_VIEWPORT_PADDING,
  );
  return Math.min(Math.max(bottom, LAUNCHER_VIEWPORT_PADDING), maxBottom);
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value) return;
  const deltaY = event.clientY - dragStartClientY;
  if (Math.abs(deltaY) > DRAG_CLICK_THRESHOLD) {
    dragMoved = true;
  }
  launcherBottom.value = clampLauncherBottom(dragStartBottom - deltaY);
}

function handlePointerUp(event?: PointerEvent) {
  if (!dragging.value) return;
  if (event) {
    handlePointerMove(event);
  }
  dragging.value = false;
  suppressNextClick.value = dragMoved;
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('pointercancel', handlePointerUp);
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  event.preventDefault();
  dragging.value = true;
  dragMoved = false;
  dragStartClientY = event.clientY;
  dragStartBottom = launcherBottom.value;
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerUp);
}

function handleWindowResize() {
  launcherBottom.value = clampLauncherBottom(launcherBottom.value);
}

function handleOpen() {
  if (suppressNextClick.value) {
    suppressNextClick.value = false;
    return;
  }
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
  type: 'dislike' | 'like' | null;
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

onMounted(() => {
  launcherBottom.value = clampLauncherBottom(LAUNCHER_DEFAULT_BOTTOM);
  window.addEventListener('resize', handleWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
  window.removeEventListener('pointercancel', handlePointerUp);
});
</script>

<template>
  <button
    class="fixed right-[17px] z-999 flex-center size-12 cursor-grab touch-none rounded-full border border-solid border-[#D9D9D9] bg-white p-0 shadow-[0px_4px_16px_rgba(0,0,0,0.16)] outline-none select-none active:cursor-grabbing dark:border-[#2B2B2B] dark:bg-[#0B0B0B]"
    :style="launcherStyle"
    type="button"
    aria-label="打开小曦助手"
    @pointerdown="handlePointerDown"
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
    :active-conversation-from-history="activeConversationFromHistory"
    :assistant-meta-by-id="assistantMetaById"
    :history-items="historyItems"
    :history-loading="historySessionsLoading"
    :messages="chatMessages"
    :pending="pending"
    :restoring="restoreLoading"
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
    :active-conversation-from-history="activeConversationFromHistory"
    :assistant-meta-by-id="assistantMetaById"
    :history-items="historyItems"
    :history-loading="historySessionsLoading"
    :messages="chatMessages"
    :pending="pending"
    :restoring="restoreLoading"
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
