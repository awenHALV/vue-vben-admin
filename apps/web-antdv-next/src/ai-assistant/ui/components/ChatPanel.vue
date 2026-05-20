<script setup lang="ts">
import type {
  AiAssistantPanelVariant,
  AiChatAssistantMessagePartChart,
  AiChatMessage,
} from '../../types';

import type { AssistantMessageMeta } from '#/store/chat';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  watchEffect,
} from 'vue';

import { IconifyIcon } from '@vben/icons';

import { AI_ASSISTANT_ICON_URL, LINGXI_AGENT_ICON_URL } from '../../ai-assets';
import { AI_ASSISTANT_DEMO_MESSAGES } from '../../mock/demo-messages';
import { renderMarkdown } from '../../utils/markdown';
import Avatar from './Avatar.vue';
import ChartMessage from './ChartMessage.vue';
import ChatMessageFeedbackBar from './ChatMessageFeedbackBar.vue';

defineOptions({
  name: 'ChatPanel',
});

const props = withDefaults(
  defineProps<{
    activeAgent?: string;
    activeConversationId: null | string;
    assistantMetaById?: Record<string, AssistantMessageMeta>;
    /** 未传时使用内置 demo；接入 SSE 后由上层拼装为列表传入 */
    messages?: AiChatMessage[];
    variant?: AiAssistantPanelVariant;
  }>(),
  {
    activeAgent: '',
    assistantMetaById: undefined,
    messages: undefined,
    variant: 'drawer',
  },
);

const emit = defineEmits<{
  (e: 'toggleThinking', messageId: string): void;
  (e: 'openDetail', messageId: string): void;
  (
    e: 'feedback',
    payload: { messageId: string; type: 'dislike' | 'like' | null },
  ): void;
}>();

const displayMessages = computed(
  () => props.messages ?? AI_ASSISTANT_DEMO_MESSAGES,
);

/** 与 DrawerSideToolbar 一致：activeAgent 为接口返回的 agentId，非旧版 lingxi/xiaoxi 别名 */
const assistantAvatarByAgentId: Record<
  string,
  { alt: string; imgClass: string; src: string }
> = {
  'ops-monitor': {
    alt: '小羲助手',
    imgClass: 'size-[18px]',
    src: AI_ASSISTANT_ICON_URL,
  },
  'power-trade': {
    alt: '灵羲交易',
    imgClass: 'size-8',
    src: LINGXI_AGENT_ICON_URL,
  },
};

const assistantAvatar = computed(() => {
  const mapped = assistantAvatarByAgentId[props.activeAgent];
  if (mapped) return mapped;
  return {
    alt: 'AI',
    imgClass: 'size-[18px]',
    src: undefined,
  };
});

function chartPartOf(msg: AiChatMessage) {
  if (msg.role !== 'assistant') return null;
  if (msg.kind !== 'rich') return null;
  return msg.parts.filter(
    (p): p is AiChatAssistantMessagePartChart => p.type === 'chart',
  );
}

function markdownOf(msg: AiChatMessage): string {
  if (msg.role !== 'assistant') return '';
  // if (isWelcomeMessage(msg) && props.activeAgent === 'power-trade') {
  //   return '你好，我是灵羲交易，请问有什么可以帮助你的。';
  // }
  if (msg.kind === 'text') return msg.text ?? '';
  if (msg.kind === 'rich') {
    const part = msg.parts.find((p) => p.type === 'markdown');
    return part?.type === 'markdown' ? (part.content ?? '') : '';
  }
  return '';
}

const autoCollapsedThinking = ref<Record<string, true>>({});
const feedbackByMessageId = ref<Record<string, 'dislike' | 'like' | null>>({});
const singleLineWelcomeByMessageId = ref<Record<string, true>>({});
const streamEndRef = ref<HTMLElement | null>(null);
const welcomeContentEls = new Map<string, HTMLElement>();
const welcomeContentIdByEl = new WeakMap<HTMLElement, string>();
let welcomeResizeObserver: null | ResizeObserver = null;

/** 当前轮助手是否仍在输出（思考 / token / 未 type=done），用于生成过程中保持视口跟到底部 */
const assistantGenerationInProgress = computed((): boolean => {
  const list = displayMessages.value;
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!;
    if (m.role === 'user') return false;
    if (m.kind === 'text' || m.kind === 'rich') {
      const meta = assistantMeta(m.id);
      return Boolean(meta && !meta.qaFinished);
    }
  }
  return false;
});

function scheduleScrollToStreamEnd() {
  if (!assistantGenerationInProgress.value) return;
  void nextTick().then(() => {
    requestAnimationFrame(() => {
      streamEndRef.value?.scrollIntoView({ block: 'end', behavior: 'auto' });
    });
  });
}

watch(
  [displayMessages, () => props.assistantMetaById],
  () => {
    scheduleScrollToStreamEnd();
  },
  { deep: true, flush: 'post' },
);

watch(
  () => props.activeConversationId,
  () => {
    feedbackByMessageId.value = {};
  },
);

function handleFeedback(messageId: string, type: 'dislike' | 'like' | null) {
  feedbackByMessageId.value = {
    ...feedbackByMessageId.value,
    [messageId]: type,
  };
  emit('feedback', { messageId, type });
}

function canShowFeedbackBar(messageId: string): boolean {
  const meta = assistantMeta(messageId);
  // 接入 SSE 后：只有当 type=done（qaFinished=true）时才展示反馈
  if (meta) return Boolean(meta.qaFinished);
  // demo / 无 meta 的历史消息默认允许展示
  return true;
}

watchEffect(() => {
  // 非全屏时：当思考完成，自动收起（仅触发一次，避免干扰用户手动展开）
  if (props.variant === 'fullscreen') return;
  const messages = displayMessages.value;
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;
    const meta = assistantMeta(msg.id);
    if (!meta) continue;
    if (!meta.thinkingFinished) continue;
    if (meta.thinking.collapsed) continue;
    if (autoCollapsedThinking.value[msg.id]) continue;

    autoCollapsedThinking.value = {
      ...autoCollapsedThinking.value,
      [msg.id]: true,
    };
    emit('toggleThinking', msg.id);
  }
});

function assistantMeta(messageId: string): AssistantMessageMeta | null {
  return props.assistantMetaById?.[messageId] ?? null;
}

function isWelcomeMessage(msg: AiChatMessage): boolean {
  return (
    msg.role === 'assistant' && msg.kind === 'rich' && msg.isWelcome === true
  );
}

function isSingleLineWelcome(messageId: string): boolean {
  return singleLineWelcomeByMessageId.value[messageId] === true;
}

function setWelcomeSingleLine(messageId: string, isSingleLine: boolean) {
  const current = singleLineWelcomeByMessageId.value[messageId] === true;
  if (current === isSingleLine) return;

  const next = { ...singleLineWelcomeByMessageId.value };
  if (isSingleLine) {
    next[messageId] = true;
  } else {
    delete next[messageId];
  }
  singleLineWelcomeByMessageId.value = next;
}

function updateWelcomeSingleLine(messageId: string, el: HTMLElement) {
  const measureEl =
    el.firstElementChild instanceof HTMLElement ? el.firstElementChild : el;
  const style = window.getComputedStyle(measureEl);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
  setWelcomeSingleLine(messageId, measureEl.scrollHeight <= lineHeight * 1.5);
}

function ensureWelcomeResizeObserver() {
  if (welcomeResizeObserver) return welcomeResizeObserver;
  welcomeResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const messageId = welcomeContentIdByEl.get(el);
      if (messageId) updateWelcomeSingleLine(messageId, el);
    }
  });
  return welcomeResizeObserver;
}

function setWelcomeContentRef(msg: AiChatMessage, el: Element | null) {
  if (!isWelcomeMessage(msg)) return;

  const previousEl = welcomeContentEls.get(msg.id);
  if (previousEl) {
    welcomeResizeObserver?.unobserve(previousEl);
    welcomeContentEls.delete(msg.id);
  }

  if (!(el instanceof HTMLElement)) {
    setWelcomeSingleLine(msg.id, false);
    return;
  }

  welcomeContentEls.set(msg.id, el);
  welcomeContentIdByEl.set(el, msg.id);
  ensureWelcomeResizeObserver().observe(el);
  void nextTick().then(() => updateWelcomeSingleLine(msg.id, el));
}

onBeforeUnmount(() => {
  welcomeResizeObserver?.disconnect();
  welcomeResizeObserver = null;
  welcomeContentEls.clear();
});

/** 本会话内点击优先；否则用 store restore / submitFeedback 写入的 feedbackStatus */
function feedbackModelFor(messageId: string): 'dislike' | 'like' | null {
  const local = feedbackByMessageId.value[messageId];
  if (local !== undefined) return local;
  const fromMeta = assistantMeta(messageId)?.feedbackStatus;
  if (fromMeta === 'like' || fromMeta === 'dislike') return fromMeta;
  return null;
}

function thinkingTitle(meta: AssistantMessageMeta): string {
  if (meta.thinking.status === 'error') return '思考出错';
  if (meta.thinkingFinished) return '思考完成';
  return '思考中...';
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-for="msg in displayMessages" :key="msg.id">
      <!-- 用户 -->
      <div v-if="msg.role === 'user'" class="flex justify-end gap-3">
        <div
          :class="
            props.variant === 'fullscreen'
              ? 'max-w-[min(100%,600px)] rounded-lg bg-muted px-3 py-2 text-sm/6 break-all'
              : 'max-w-[216px] rounded-lg bg-[rgba(0,0,0,0.06)] px-4 py-3 text-sm leading-[22px] break-all text-[rgba(0,0,0,0.88)] dark:bg-muted dark:text-foreground'
          "
        >
          {{ msg.text }}
        </div>
      </div>

      <!-- 助手：文本/复合消息（每条均带头像） -->
      <div
        v-else-if="msg.kind === 'text' || msg.kind === 'rich'"
        class="group flex flex-col gap-2"
      >
        <div
          class="flex gap-3"
          :class="isSingleLineWelcome(msg.id) ? 'items-center' : 'items-start'"
        >
          <Avatar
            :alt="assistantAvatar.alt"
            :class="isSingleLineWelcome(msg.id) ? 'mt-0!' : undefined"
            :img-class="assistantAvatar.imgClass"
            :src="assistantAvatar.src"
          />
          <div
            class="group flex flex-col gap-2"
            :class="[
              props.variant === 'fullscreen'
                ? 'w-full'
                : 'w-full max-w-[324px]',
            ]"
          >
            <!-- 深度思考（时间轴） -->
            <div v-if="assistantMeta(msg.id)" class="flex flex-col gap-2">
              <div
                class="flex-start flex cursor-pointer items-center gap-1"
                @click="emit('toggleThinking', msg.id)"
              >
                <div
                  :class="
                    props.variant === 'fullscreen'
                      ? 'text-xs text-muted-foreground'
                      : 'text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
                  "
                >
                  {{ thinkingTitle(assistantMeta(msg.id)!) }}
                </div>
                <button
                  class="text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  <IconifyIcon
                    :icon="
                      assistantMeta(msg.id)!.thinking.collapsed
                        ? 'lucide:chevron-right'
                        : 'lucide:chevron-down'
                    "
                    class="size-4"
                  />
                </button>
              </div>

              <div
                v-if="!assistantMeta(msg.id)!.thinking.collapsed"
                class="flex flex-col gap-2"
              >
                <div
                  v-for="(step, idx) in assistantMeta(msg.id)!.thinking.steps"
                  :key="`${msg.id}-${step.step}-${idx}`"
                  class="flex gap-3"
                >
                  <div class="flex w-4 flex-col items-center">
                    <div
                      :class="
                        assistantMeta(msg.id)!.thinkingFinished
                          ? 'flex-center size-4 rounded-full bg-muted text-[10px] text-muted-foreground'
                          : 'size-2 rounded-full bg-muted-foreground/60'
                      "
                    >
                      <span v-if="assistantMeta(msg.id)!.thinkingFinished">
                        ✓
                      </span>
                    </div>
                    <div
                      v-if="
                        idx !== assistantMeta(msg.id)!.thinking.steps.length - 1
                      "
                      class="mt-1 w-px flex-1 bg-muted-foreground/30"
                    ></div>
                  </div>

                  <div class="flex flex-1 flex-col gap-1">
                    <div
                      class="text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
                    >
                      {{ step.step }}
                    </div>
                    <div
                      class="text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
                      v-html="renderMarkdown(step.content)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 思考完成到输出结果之间的过渡动画 -->
            <div
              v-if="
                assistantMeta(msg.id)?.thinkingFinished &&
                assistantMeta(msg.id)?.thinking.status !== 'error' &&
                markdownOf(msg).trim().length === 0
              "
              class="flex items-center"
            >
              <span class="chat-panel-generating-text text-sm font-medium">
                正在生成回答...
              </span>
            </div>

            <!-- 图表片段（若存在，优先展示） -->
            <div v-if="chartPartOf(msg)?.length" class="w-full">
              <div
                v-if="props.variant === 'fullscreen'"
                class="w-full rounded-lg border bg-card p-3"
              >
                <div class="flex flex-col gap-3">
                  <ChartMessage
                    v-for="(chart, idx) in chartPartOf(msg)!"
                    :key="`${msg.id}-${idx}`"
                    :chart-config="chart.chartConfig"
                    :chart-data="chart.chartData"
                  />
                </div>
              </div>
              <div v-else class="group flex w-full flex-col gap-2">
                <div
                  v-for="(chart, idx) in chartPartOf(msg)!"
                  :key="`${msg.id}-${idx}`"
                  class="flex cursor-pointer items-center gap-3 rounded-lg border border-[#F0F0F0] bg-white px-3 py-2 transition-colors hover:bg-[rgba(0,0,0,0.02)] dark:border-border dark:bg-card dark:hover:bg-accent"
                  role="button"
                  tabindex="0"
                  @click="emit('openDetail', msg.id)"
                  @keydown.enter.prevent="emit('openDetail', msg.id)"
                >
                  <div
                    class="flex-center size-10 shrink-0 rounded-md bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.65)] dark:bg-muted dark:text-muted-foreground"
                  >
                    <IconifyIcon class="size-5" icon="lucide:bar-chart-3" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div
                      class="truncate text-sm font-medium text-[rgba(0,0,0,0.88)] dark:text-foreground"
                    >
                      {{ chart.chartConfig.title ?? '图表' }}
                    </div>
                    <div
                      class="mt-0.5 text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
                    >
                      点击查看详细数据分析
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 结果（token 拼接 / markdown 文本） -->
            <div
              v-if="markdownOf(msg).trim().length > 0"
              :ref="(el) => setWelcomeContentRef(msg, el)"
              class="markdown-body"
              :class="[
                props.variant === 'fullscreen'
                  ? 'text-sm/6 text-foreground'
                  : 'text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-foreground',
                isSingleLineWelcome(msg.id)
                  ? 'chat-panel-welcome-message-single-line'
                  : '',
              ]"
              v-html="renderMarkdown(markdownOf(msg))"
            ></div>
          </div>
        </div>

        <ChatMessageFeedbackBar
          v-if="canShowFeedbackBar(msg.id)"
          class="ml-11"
          :model-value="feedbackModelFor(msg.id)"
          @feedback="(type) => handleFeedback(msg.id, type)"
        />
      </div>

      <!-- 助手：卡片（每条均带头像） -->
      <div v-else-if="msg.kind === 'card'" class="flex gap-3">
        <Avatar
          :alt="assistantAvatar.alt"
          :img-class="assistantAvatar.imgClass"
          :src="assistantAvatar.src"
        />
        <div
          class="rounded-lg border text-sm text-muted-foreground"
          :class="[
            props.variant === 'fullscreen'
              ? 'w-full bg-card p-3'
              : 'w-[324px] border-[#F0F0F0] bg-white p-3 dark:border-border dark:bg-card dark:text-muted-foreground',
          ]"
        >
          <div
            :class="
              props.variant === 'fullscreen'
                ? 'font-medium text-foreground'
                : 'font-medium text-[rgba(0,0,0,0.88)] dark:text-foreground'
            "
          >
            {{ msg.title }}
          </div>
          <div
            v-if="msg.subtitle"
            :class="
              props.variant === 'fullscreen'
                ? 'mt-1 text-xs'
                : 'mt-1 text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
            "
          >
            {{ msg.subtitle }}
          </div>
          <div
            class="mt-2 h-[58px] rounded-sm"
            :class="[
              props.variant === 'fullscreen'
                ? 'w-full bg-muted'
                : 'w-[230px] bg-[rgba(0,0,0,0.04)] dark:bg-muted',
            ]"
          ></div>
        </div>
      </div>
    </template>

    <!-- <div
      v-if="props.activeConversationId"
      :class="
        props.variant === 'fullscreen'
          ? 'text-xs text-muted-foreground'
          : 'text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
      "
    >
      当前会话：{{ props.activeConversationId }}
    </div> -->

    <div
      ref="streamEndRef"
      class="h-px w-full shrink-0"
      aria-hidden="true"
    ></div>
  </div>
</template>

<style scoped>
@keyframes chat-panel-generating-sweep {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.chat-panel-generating-text {
  display: inline-block;
  background-image: linear-gradient(
    90deg,
    rgb(163 163 163) 0%,
    rgb(163 163 163) 36%,
    rgb(17 24 39) 50%,
    rgb(163 163 163) 64%,
    rgb(163 163 163) 100%
  );
  background-size: 240% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: chat-panel-generating-sweep 2.4s ease-in-out infinite;
}

:global(html.dark) .chat-panel-generating-text {
  background-image: linear-gradient(
    90deg,
    rgb(163 163 163 / 0.4) 0%,
    rgb(163 163 163 / 0.4) 36%,
    rgb(243 244 246) 50%,
    rgb(163 163 163 / 0.4) 64%,
    rgb(163 163 163 / 0.4) 100%
  );
}

.chat-panel-welcome-message-single-line :deep(p) {
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  .chat-panel-generating-text {
    animation: none;
    background: none;
    background-clip: unset;
    -webkit-background-clip: unset;
    -webkit-text-fill-color: unset;
    color: rgb(115 115 115);
  }

  :global(html.dark) .chat-panel-generating-text {
    color: rgb(163 163 163);
  }
}
</style>
