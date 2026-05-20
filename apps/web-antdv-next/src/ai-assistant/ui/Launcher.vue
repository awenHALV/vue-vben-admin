<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { App } from 'antdv-next';
import { storeToRefs } from 'pinia';

import { getChatAgentsApi } from '#/api/chat';
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
  agentProfileLoading,
  agentQuestionsById,
  agentWelcomeById,
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
const activeAgent = ref<string>('');
let dragStartClientY = 0;
let dragStartBottom = 0;
let dragMoved = false;

// Agent 列表数据
interface AgentItem {
  agentId: string;
  name: string;
}

const agents = ref<AgentItem[]>([]);

// 获取当前选中的 agentId
// const currentAgentId = computed(() => {
//   // 根据 activeAgent 找到对应的 agentId
//   console.log(activeAgent.value, 'activeAgent.value activeAgent.value ');
//   const agentName = activeAgent.value === 'xiaoxi' ? '小羲助手' : '灵羲交易';
//   const agent = agents.value.find((a) => a.name === agentName);
//   return agent?.agentId;
// });

// 加载 Agent 列表（与 DrawerSideToolbar 一致：requestClient 返回已解包的 data 数组）
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

function getDefaultAgentId(): string {
  return agents.value[0]?.agentId ?? '';
}

async function ensureAgentsReady(): Promise<boolean> {
  if (agents.value.length > 0) return true;
  await loadAgents();
  return agents.value.length > 0;
}

/** 每次打开抽屉：默认第一个 agent，并拉取欢迎语 / 推荐问题 */
async function resetToDefaultAgentAndPrepare() {
  const ready = await ensureAgentsReady();
  const defaultAgentId = getDefaultAgentId();
  if (!ready || !defaultAgentId) return;

  activeAgent.value = defaultAgentId;
  chatStore.setCurrentAgentId(defaultAgentId);
  await chatStore.prepareAgentChat(defaultAgentId);
}

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

async function handleOpen() {
  if (suppressNextClick.value) {
    suppressNextClick.value = false;
    return;
  }
  await resetToDefaultAgentAndPrepare();
  chatStore.openPanel();
}

function handleClose() {
  chatStore.closePanel();
  activeAgent.value = '';
}

function handleNewChat() {
  chatStore.setCurrentAgentId(activeAgent.value);
  chatStore.newChat(activeAgent.value);
}

function handleToggleView() {
  chatStore.toggleView();
}

function handleOpenHistory() {
  chatStore.openHistory();
}

function handleGoChat() {
  activeAgent.value = agents.value[0]?.agentId || '';
  chatStore.setCurrentAgentId(activeAgent.value);
  void chatStore.prepareAgentChat(activeAgent.value);
}

function handleSelectAgent(agentId: string) {
  activeAgent.value = agentId;
  chatStore.setCurrentAgentId(agentId);
  void chatStore.prepareAgentChat(agentId);
}

async function handleSelectConversation(id: string) {
  await chatStore.selectConversation(id);
}

async function handleSendMessage(text: string) {
  chatStore.setCurrentAgentId(activeAgent.value);
  await chatStore.sendMessage(text, activeAgent.value);
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
  void loadAgents();
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
    :active-agent="activeAgent"
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
    :agent-welcome-by-id="agentWelcomeById"
    :agent-questions-by-id="agentQuestionsById"
    :agent-profile-loading="agentProfileLoading"
    @close="handleClose"
    @new-chat="handleNewChat"
    @toggle-view="handleToggleView"
    @open-history="handleOpenHistory"
    @go-chat="handleGoChat"
    @select-agent="handleSelectAgent"
    @select-conversation="handleSelectConversation"
    @delete-conversation="handleDeleteConversation"
    @send-message="handleSendMessage"
    @toggle-thinking="handleToggleThinking"
    @feedback="handleFeedback"
  />
  <Fullscreen
    v-else-if="open && viewMode === 'full'"
    :active-agent="activeAgent"
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
    :agent-welcome-by-id="agentWelcomeById"
    :agent-questions-by-id="agentQuestionsById"
    :agent-profile-loading="agentProfileLoading"
    @close="handleClose"
    @new-chat="handleNewChat"
    @toggle-view="handleToggleView"
    @open-history="handleOpenHistory"
    @go-chat="handleGoChat"
    @select-agent="handleSelectAgent"
    @select-conversation="handleSelectConversation"
    @delete-conversation="handleDeleteConversation"
    @send-message="handleSendMessage"
    @toggle-thinking="handleToggleThinking"
    @feedback="handleFeedback"
  />
</template>
