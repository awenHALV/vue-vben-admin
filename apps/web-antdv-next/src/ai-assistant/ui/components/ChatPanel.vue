<script setup lang="ts">
import type { AiAssistantPanelVariant, AiChatMessage } from '../../types';

import type { AssistantMessageMeta } from '#/store/chat';

import { computed, nextTick, ref, watch, watchEffect } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { AI_ASSISTANT_DEMO_MESSAGES } from '../../mock/demo-messages';
import Avatar from './Avatar.vue';
import ChartMessage from './ChartMessage.vue';
import ChatMessageFeedbackBar from './ChatMessageFeedbackBar.vue';

defineOptions({
  name: 'ChatPanel',
});

const props = withDefaults(
  defineProps<{
    activeConversationId: null | string;
    assistantMetaById?: Record<string, AssistantMessageMeta>;
    /** 未传时使用内置 demo；接入 SSE 后由上层拼装为列表传入 */
    messages?: AiChatMessage[];
    variant?: AiAssistantPanelVariant;
  }>(),
  {
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
    payload: { messageId: string; type: 'dislike' | 'like' },
  ): void;
}>();

const displayMessages = computed(
  () => props.messages ?? AI_ASSISTANT_DEMO_MESSAGES,
);

function chartPartOf(msg: AiChatMessage) {
  if (msg.role !== 'assistant') return null;
  if (msg.kind !== 'rich') return null;
  const part = msg.parts.find((p) => p.type === 'chart');
  return part?.type === 'chart' ? part : null;
}

function markdownOf(msg: AiChatMessage): string {
  if (msg.role !== 'assistant') return '';
  if (msg.kind === 'text') return msg.text ?? '';
  if (msg.kind === 'rich') {
    const part = msg.parts.find((p) => p.type === 'markdown');
    return part?.type === 'markdown' ? (part.content ?? '') : '';
  }
  return '';
}

const autoCollapsedThinking = ref<Record<string, true>>({});
const feedbackByMessageId = ref<Record<string, 'dislike' | 'like'>>({});
const streamEndRef = ref<HTMLElement | null>(null);

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

function handleFeedback(messageId: string, type: 'dislike' | 'like') {
  feedbackByMessageId.value = {
    ...feedbackByMessageId.value,
    [messageId]: type,
  };
  emit('feedback', { messageId, type });
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

function thinkingTitle(meta: AssistantMessageMeta): string {
  if (meta.thinking.status === 'error') return '思考出错';
  if (meta.thinkingFinished) return '思考完成';
  return '思考中...';
}

type MarkdownBlock =
  | { content: string; type: 'text' }
  | { header: string[]; rows: string[][]; type: 'table' };

function normalizeMdTableLine(line: string): string {
  return line.trimEnd().replaceAll(/\|{2,}\s*$/g, '|');
}

function isMdTableSeparatorRow(line: string): boolean {
  const raw = line.trim();
  if (!raw.includes('|')) return false;
  const withoutEdges = raw.startsWith('|') ? raw.slice(1) : raw;
  const trimmed = withoutEdges.endsWith('|')
    ? withoutEdges.slice(0, -1)
    : withoutEdges;
  const cells = trimmed
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (cells.length < 2) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseMdTableRow(line: string): string[] {
  const raw = normalizeMdTableLine(line).trim();
  const withoutEdges = raw.startsWith('|') ? raw.slice(1) : raw;
  const trimmed = withoutEdges.endsWith('|')
    ? withoutEdges.slice(0, -1)
    : withoutEdges;
  const cells = trimmed.split('|').map((c) => c.trim());
  while (cells.length > 1 && cells[cells.length - 1] === '') {
    cells.pop();
  }
  return cells;
}

function looksLikeMdTableHeaderRow(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|')) return false;
  if (isMdTableSeparatorRow(t)) return false;
  const cells = parseMdTableRow(t).filter((c) => c.length > 0);
  return cells.length >= 2;
}

function indexOfNextNonEmptyLine(lines: string[], fromIdx: number): number {
  for (let j = fromIdx; j < lines.length; j++) {
    if ((lines[j] ?? '').trim().length > 0) return j;
  }
  return -1;
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = (markdown ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n');
  const blocks: MarkdownBlock[] = [];
  let textBuf: string[] = [];

  function flushText() {
    const content = textBuf.join('\n');
    if (content.trim().length > 0) blocks.push({ type: 'text', content });
    textBuf = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const sepIdx = indexOfNextNonEmptyLine(lines, i + 1);
    const sepLine = sepIdx === -1 ? '' : (lines[sepIdx] ?? '');

    if (looksLikeMdTableHeaderRow(line) && isMdTableSeparatorRow(sepLine)) {
      const header = parseMdTableRow(line);
      if (header.filter((c) => c.length > 0).length < 2) {
        textBuf.push(line);
        continue;
      }

      let j = sepIdx + 1;
      const rows: string[][] = [];
      while (j < lines.length) {
        const rowRaw = lines[j] ?? '';
        const rowLine = normalizeMdTableLine(rowRaw).trim();
        if (!rowLine.includes('|')) break;
        if (isMdTableSeparatorRow(rowLine)) {
          j++;
          continue;
        }
        rows.push(parseMdTableRow(rowLine));
        j++;
      }

      if (rows.length === 0) {
        textBuf.push(line);
        continue;
      }

      flushText();
      i = j - 1;

      const colCount = Math.max(header.length, ...rows.map((r) => r.length));
      const normHeader = Array.from(
        { length: colCount },
        (_, idx) => header[idx] ?? '',
      );
      const normRows = rows.map((r) =>
        Array.from({ length: colCount }, (_, idx) => r[idx] ?? ''),
      );

      blocks.push({ type: 'table', header: normHeader, rows: normRows });
      continue;
    }

    textBuf.push(line);
  }

  flushText();
  return blocks;
}

type InlineToken = { bold: boolean; text: string };

function tokenizeInlineMarkdown(input = ''): InlineToken[] {
  const text = input;
  const re = /\*\*(.+?)\*\*/g;
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(re)) {
    const start = match.index ?? 0;
    const full = match[0] ?? '';
    const inner = match[1] ?? '';
    if (start > lastIndex) {
      tokens.push({ bold: false, text: text.slice(lastIndex, start) });
    }
    if (inner) tokens.push({ bold: true, text: inner });
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    tokens.push({ bold: false, text: text.slice(lastIndex) });
  }
  return tokens;
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
              ? 'max-w-[min(100%,216px)] rounded-lg bg-muted px-3 py-2 text-sm/6'
              : 'max-w-[216px] rounded-lg bg-[rgba(0,0,0,0.06)] px-4 py-3 text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:bg-muted dark:text-foreground'
          "
        >
          {{ msg.text }}
        </div>
      </div>

      <!-- 助手：文本/复合消息（每条均带头像） -->
      <div
        v-else-if="msg.kind === 'text' || msg.kind === 'rich'"
        class="flex gap-3"
      >
        <Avatar />
        <div class="group flex w-full max-w-[324px] flex-col gap-2">
          <!-- 深度思考（时间轴） -->
          <div v-if="assistantMeta(msg.id)" class="flex flex-col gap-2">
            <div class="flex-start flex items-center gap-3">
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
                @click="emit('toggleThinking', msg.id)"
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
                    :class="
                      props.variant === 'fullscreen'
                        ? 'text-xs text-muted-foreground'
                        : 'text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground'
                    "
                  >
                    {{ step.step }}
                  </div>
                  <div
                    :class="
                      props.variant === 'fullscreen'
                        ? 'text-sm/6 whitespace-pre-line text-foreground'
                        : 'text-sm leading-[22px] whitespace-pre-line text-[rgba(0,0,0,0.88)] dark:text-foreground'
                    "
                  >
                    {{ step.content }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 图表片段（若存在，优先展示） -->
          <div v-if="chartPartOf(msg)" class="w-full">
            <div
              v-if="props.variant === 'fullscreen'"
              class="w-full rounded-lg border bg-card p-3"
            >
              <ChartMessage
                :chart-config="chartPartOf(msg)!.chartConfig"
                :chart-data="chartPartOf(msg)!.chartData"
              />
            </div>
            <div v-else class="group flex w-full flex-col gap-2">
              <div
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
                    {{ chartPartOf(msg)!.chartConfig.title ?? '图表' }}
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
            class="flex flex-col gap-2"
          >
            <template
              v-for="(block, blockIdx) in parseMarkdownBlocks(markdownOf(msg))"
              :key="`${msg.id}-${block.type}-${blockIdx}`"
            >
              <div
                v-if="block.type === 'text'"
                :class="
                  props.variant === 'fullscreen'
                    ? 'text-sm/6 whitespace-pre-line text-foreground'
                    : 'text-sm leading-[22px] whitespace-pre-line text-[rgba(0,0,0,0.88)] dark:text-foreground'
                "
              >
                <template
                  v-for="(t, ti) in tokenizeInlineMarkdown(block.content)"
                  :key="ti"
                >
                  <span :class="t.bold ? 'font-semibold' : ''">
                    {{ t.text }}
                  </span>
                </template>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-xs/5">
                  <thead>
                    <tr class="border-b border-muted-foreground/20">
                      <th
                        v-for="(h, hi) in block.header"
                        :key="hi"
                        class="px-2 py-1 font-medium text-foreground"
                      >
                        {{ h }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, ri) in block.rows"
                      :key="ri"
                      class="border-b border-muted-foreground/10"
                    >
                      <td
                        v-for="(cell, ci) in row"
                        :key="ci"
                        class="px-2 py-1 align-top text-[rgba(0,0,0,0.88)] dark:text-foreground"
                      >
                        <span class="whitespace-pre-line">{{ cell }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>

          <ChatMessageFeedbackBar
            :model-value="feedbackByMessageId[msg.id] ?? null"
            @feedback="(type) => handleFeedback(msg.id, type)"
          />
        </div>
      </div>

      <!-- 助手：卡片（每条均带头像） -->
      <div v-else-if="msg.kind === 'card'" class="flex gap-3">
        <Avatar />
        <div
          :class="
            props.variant === 'fullscreen'
              ? 'w-full max-w-[324px] rounded-lg border bg-card p-3 text-sm text-muted-foreground'
              : 'w-[324px] rounded-lg border border-[#F0F0F0] bg-white p-3 text-sm dark:border-border dark:bg-card dark:text-muted-foreground'
          "
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
            :class="
              props.variant === 'fullscreen'
                ? 'mt-2 h-[58px] max-w-full rounded-sm bg-muted'
                : 'mt-2 h-[58px] w-[230px] rounded-sm bg-[rgba(0,0,0,0.04)] dark:bg-muted'
            "
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
