<script setup lang="ts">
import type { AiAssistantHistoryItem, AiChatMessage } from '../types';

import type { AssistantMessageMeta } from '#/store/chat';

import { computed, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Spin } from 'antdv-next';

import { AI_ASSISTANT_ICON_URL, LINGXI_AGENT_ICON_URL } from '../ai-assets';
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
  activeAgent: string;
  activeConversationFromHistory?: boolean;
  activeConversationId: null | string;
  agentProfileLoading?: boolean;
  agentQuestionsById?: Record<string, string[]>;
  agentWelcomeById?: Record<string, string>;
  assistantMetaById?: Record<string, AssistantMessageMeta>;
  historyItems: AiAssistantHistoryItem[];
  historyLoading?: boolean;
  /** 接入 SSE 后由上层传入；不传则使用 ChatPanel 内置 demo */
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

const chartDetailOpen = ref(false);
const chartDetailMessageId = ref<null | string>(null);
/** 图表详情全屏：与 Fullscreen 视图相同的 inset-6 视口区域 */
const chartDetailFullscreen = ref(false);
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

// const lingxiActions = [
//   { active: false, label: '查询场站设备运行状态' },
//   { active: true, label: '查询异常告警信息' },
//   { active: false, label: '查询运维手册' },
//   { active: false, label: '故障处理指南' },
// ] as const;

const detailCharts = computed(() => {
  const id = chartDetailMessageId.value;
  if (!id) return null;
  const msg = props.messages?.find((m) => m.id === id);
  if (!msg || msg.role !== 'assistant') return null;
  if (msg.kind !== 'rich') return null;
  const parts = msg.parts.filter((p) => p.type === 'chart');
  return parts.length > 0 ? parts : null;
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

function toggleAgent(agentId: string) {
  closeChartDetail();
  emit('selectAgent', agentId);
}

function sendRecommendedQuestion(text: string) {
  emit('sendMessage', text);
}

// watch(
//   () => props.open,
//   (open) => {
//     document.body.style.overflow = open ? 'hidden' : '';
//   },
//   { immediate: true },
// );

// // 确保组件被销毁时，干净地恢复页面滚动
// onUnmounted(() => {
//   document.documentElement.style.overflow = '';
//   document.body.style.overflow = '';
// });

watch(
  () => props.open,
  (open) => {
    const action = open ? 'add' : 'remove';
    document.documentElement.classList[action]('hide-main-scrollbar');
    document.body.classList[action]('hide-main-scrollbar');
  },
  { immediate: true },
);

onUnmounted(() => {
  document.documentElement.classList.remove('hide-main-scrollbar');
  document.body.classList.remove('hide-main-scrollbar');
});
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-y-0 right-[-20px] z-9999 flex overflow-hidden border-l border-border bg-background pr-[20px] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
    :class="
      chartDetailOpen && !chartDetailFullscreen ? 'w-[988px]' : 'w-[504px]'
    "
  >
    <!-- 详情抽屉放在左侧（靠近页面主体） -->
    <div
      v-if="chartDetailOpen && detailCharts && !chartDetailFullscreen"
      class="flex w-[484px] shrink-0 flex-col border-r border-border bg-background"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <div class="truncate text-base font-semibold text-foreground">
          {{ detailCharts[0]?.chartConfig.title ?? '图表详情' }}
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
          <div class="flex flex-col gap-3">
            <ChartMessage
              v-for="(chart, idx) in detailCharts"
              :key="`detail-${chartDetailMessageId}-${idx}`"
              :chart-config="chart.chartConfig"
              :chart-data="chart.chartData"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 头部区域 - 56px高，底部1px分割线 -->
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <button
          v-if="isViewingHistoryConversation"
          class="flex min-w-0 items-center gap-1 rounded-md p-0 text-base font-semibold text-foreground hover:text-foreground/80"
          type="button"
          aria-label="返回历史记录列表"
          @click="
            () => {
              closeChartDetail();
              emit('openHistory');
            }
          "
        >
          <IconifyIcon class="size-5 shrink-0" icon="lucide:chevron-left" />
          <span class="truncate">历史对话</span>
        </button>
        <div v-else class="truncate text-base font-semibold text-foreground">
          {{ props.activeAgent === 'power-trade' ? '灵羲交易' : props.title }}
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

        <!-- eslint-disable-next-line vue/max-attributes-per-line -->
        <Spin v-else :spinning="Boolean(props.restoring)" class="block w-full">
          <div
            v-if="props.restoring"
            aria-hidden="true"
            class="min-h-[min(360px,55vh)] w-full shrink-0"
          ></div>

          <div
            v-else-if="showAgentRecommendation"
            class="flex items-start gap-3"
          >
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
                    @click="sendRecommendedQuestion(question)"
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
            variant="drawer"
            :active-conversation-id="props.activeConversationId"
            :active-agent="props.activeAgent"
            :assistant-meta-by-id="props.assistantMetaById"
            :messages="props.messages"
            @toggle-thinking="emit('toggleThinking', $event)"
            @feedback="emit('feedback', $event)"
            @open-detail="openDetail"
          />
        </Spin>
      </div>

      <!-- 底部输入区域：一体胶囊框 44px，发送按钮内嵌在右侧 -->
      <ComposerFooter
        v-if="props.panelMode !== 'history'"
        :pending="props.pending"
        @submit="emit('sendMessage', $event)"
      />
    </div>

    <DrawerSideToolbar
      :active-agent="props.activeAgent"
      :panel-mode="props.panelMode"
      @go-chat="emit('goChat')"
      @open-history="
        () => {
          closeChartDetail();
          emit('openHistory');
        }
      "
      @select-agent="toggleAgent"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="chartDetailOpen && chartDetailFullscreen && detailCharts"
      class="fixed inset-6 z-1100 flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0px_4px_16px_0px_rgba(0,0,0,0.16)]"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4"
      >
        <div class="truncate text-base font-semibold text-foreground">
          {{ detailCharts[0]?.chartConfig.title ?? '图表详情' }}
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
          <div class="flex flex-col gap-3">
            <ChartMessage
              v-for="(chart, idx) in detailCharts"
              :key="`detail-full-${chartDetailMessageId}-${idx}`"
              :chart-config="chart.chartConfig"
              :chart-data="chart.chartData"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* 隐藏 webkit 浏览器（Chrome, Safari, Edge）的滚动条 */
.hide-main-scrollbar::-webkit-scrollbar {
  width: 0 !important;
  background: transparent !important;
}
/* 隐藏 Firefox 的滚动条 */
.hide-main-scrollbar {
  scrollbar-width: none !important;
}
</style>
