<script setup lang="ts">
import type { AiAssistantHistoryItem, AiChatMessage } from '../types';

import type { AssistantMessageMeta } from '#/store/chat';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import ChartMessage from './components/ChartMessage.vue';
import ChatPanel from './components/ChatPanel.vue';
import ComposerFooter from './components/ComposerFooter.vue';
import DrawerSideToolbar from './components/DrawerSideToolbar.vue';
import HeaderActions from './components/HeaderActions.vue';
import HistoryPanel from './components/HistoryPanel.vue';

defineOptions({
  name: 'Drawer',
});

const props = defineProps<{
  activeConversationId: null | string;
  assistantMetaById?: Record<string, AssistantMessageMeta>;
  historyItems: AiAssistantHistoryItem[];
  historyLoading?: boolean;
  /** 接入 SSE 后由上层传入；不传则使用 ChatPanel 内置 demo */
  messages?: AiChatMessage[];
  open: boolean;
  panelMode: 'chat' | 'history';
  pending?: boolean;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
  deleteConversation: [id: string];
  feedback: [payload: { messageId: string; type: 'dislike' | 'like' }];
  goChat: [];
  newChat: [];
  openHistory: [];
  selectConversation: [id: string];
  sendMessage: [text: string];
  toggleThinking: [messageId: string];
  toggleView: [];
}>();

const chartDetailOpen = ref(false);
const chartDetailMessageId = ref<null | string>(null);
/** 图表详情全屏：与 Fullscreen 视图相同的 inset-6 视口区域 */
const chartDetailFullscreen = ref(false);

const detailMessage = computed(() => {
  const id = chartDetailMessageId.value;
  if (!id) return null;
  const msg = props.messages?.find((m) => m.id === id);
  if (!msg || msg.role !== 'assistant') return null;
  if (msg.kind !== 'rich') return null;
  const part = msg.parts.find((p) => p.type === 'chart');
  return part?.type === 'chart' ? part : null;
});

function openDetail(messageId: string) {
  chartDetailMessageId.value = messageId;
  chartDetailOpen.value = true;
  chartDetailFullscreen.value = false;
}

function closeChartDetail() {
  chartDetailOpen.value = false;
  chartDetailMessageId.value = null;
  chartDetailFullscreen.value = false;
}

function toggleChartDetailFullscreen() {
  chartDetailFullscreen.value = !chartDetailFullscreen.value;
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-y-0 right-0 z-1000 flex overflow-hidden border-l border-border bg-background shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
    :class="
      chartDetailOpen && !chartDetailFullscreen ? 'w-[968px]' : 'w-[484px]'
    "
  >
    <!-- 详情抽屉放在左侧（靠近页面主体） -->
    <div
      v-if="chartDetailOpen && detailMessage && !chartDetailFullscreen"
      class="flex w-[484px] shrink-0 flex-col border-r border-border bg-background"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <div class="truncate text-base font-semibold text-foreground">
          {{ detailMessage.chartConfig.title ?? '图表详情' }}
        </div>

        <div class="flex items-center gap-2">
          <!-- <button
            class="flex-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="下载"
          >
            <IconifyIcon class="size-4" icon="lucide:download" />
          </button> -->
          <button
            class="flex-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="全屏"
            @click="toggleChartDetailFullscreen"
          >
            <IconifyIcon class="size-4" icon="lucide:maximize-2" />
          </button>
          <button
            class="flex-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="关闭"
            @click="closeChartDetail"
          >
            <IconifyIcon class="size-4" icon="lucide:x" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div class="rounded-lg border border-border bg-card p-3">
          <ChartMessage
            :chart-config="detailMessage.chartConfig"
            :chart-data="detailMessage.chartData"
          />
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 头部区域 - 56px高，底部1px分割线 -->
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <div class="truncate text-base font-semibold text-foreground">
          {{ props.title }}
        </div>

        <HeaderActions
          :panel-mode="props.panelMode"
          toggle-icon="lucide:maximize-2"
          @close="
            () => {
              closeChartDetail();
              emit('close');
            }
          "
          @new-chat="
            () => {
              closeChartDetail();
              emit('newChat');
            }
          "
          @toggle-view="
            () => {
              closeChartDetail();
              emit('toggleView');
            }
          "
        />
      </div>

      <!-- 内容区域 -->
      <div class="min-h-0 flex-1 overflow-auto bg-background p-4">
        <HistoryPanel
          v-if="props.panelMode === 'history'"
          variant="drawer"
          :history-items="props.historyItems"
          :history-loading="props.historyLoading"
          @delete-conversation="emit('deleteConversation', $event)"
          @select-conversation="emit('selectConversation', $event)"
        />

        <ChatPanel
          v-else
          variant="drawer"
          :active-conversation-id="props.activeConversationId"
          :assistant-meta-by-id="props.assistantMetaById"
          :messages="props.messages"
          @toggle-thinking="emit('toggleThinking', $event)"
          @feedback="emit('feedback', $event)"
          @open-detail="openDetail"
        />
      </div>

      <!-- 底部输入区域：一体胶囊框 44px，发送按钮内嵌在右侧 -->
      <ComposerFooter
        v-if="props.panelMode !== 'history'"
        :pending="props.pending"
        @submit="emit('sendMessage', $event)"
      />
    </div>

    <DrawerSideToolbar
      :panel-mode="props.panelMode"
      @go-chat="emit('goChat')"
      @open-history="
        () => {
          closeChartDetail();
          emit('openHistory');
        }
      "
    />
  </div>

  <Teleport to="body">
    <div
      v-if="chartDetailOpen && chartDetailFullscreen && detailMessage"
      class="fixed inset-6 z-1100 flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <div class="truncate text-base font-semibold text-foreground">
          {{ detailMessage.chartConfig.title ?? '图表详情' }}
        </div>

        <div class="flex items-center gap-2">
          <button
            class="flex-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="退出全屏"
            @click="toggleChartDetailFullscreen"
          >
            <IconifyIcon class="size-4" icon="lucide:minimize-2" />
          </button>
          <button
            class="flex-center size-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            type="button"
            aria-label="关闭"
            @click="closeChartDetail"
          >
            <IconifyIcon class="size-4" icon="lucide:x" />
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <div class="rounded-lg border border-border bg-card p-3">
          <ChartMessage
            :chart-config="detailMessage.chartConfig"
            :chart-data="detailMessage.chartData"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>
