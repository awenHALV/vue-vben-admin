import type {
  AiAssistantHistoryItem,
  AiChatAssistantChartConfig,
  AiChatAssistantMessagePart,
  AiChatAssistantRichMessage,
  AiChatMessage,
} from '../ai-assistant/types';

import { computed, ref } from 'vue';

import { useAccessStore } from '@vben/stores';

import { message as antdMessage } from 'antdv-next';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { defineStore } from 'pinia';

import {
  BASE_URL,
  deleteChatSessionApi,
  getChatSessionsApi,
  postChatFeedbackApi,
  postChatRestoreApi,
  postChatSendApi,
} from '#/api/chat';

type PanelMode = 'chat' | 'history';
type ViewMode = 'full' | 'right';

const WELCOME_TEXT = '你好！我是小曦助手。我将为你提供专业的能源互联网支持。';

type ThinkingStepStatus = 'done' | 'error' | 'thinking';

export type AssistantThinkingStep = {
  content: string;
  status: ThinkingStepStatus;
  step: string;
};

export type AssistantThinkingMeta = {
  collapsed: boolean;
  endedAt?: number;
  startedAt: number;
  status: ThinkingStepStatus;
  steps: AssistantThinkingStep[];
};

export type AssistantAnswerMeta = {
  streaming: boolean;
};

export type AssistantMessageMeta = {
  answer: AssistantAnswerMeta;
  /** restore / 提交反馈后：已赞、已踩或未反馈 */
  feedbackStatus?: 'dislike' | 'like' | null;
  /** 问答整轮是否已结束（对应 SSE type=done） */
  qaFinished: boolean;
  thinking: AssistantThinkingMeta;
  /** 深度思考是否已结束（对应 thinking 帧 thinkingStatus=done） */
  thinkingFinished: boolean;
  thinkingFinishedAt?: number;
};

function safeUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  // 退化：优先使用 getRandomValues
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint8Array(16);
    cryptoObj.getRandomValues(buf);
    // RFC4122 v4
    buf[6] = (buf[6] & 0x0F) | 0x40;
    buf[8] = (buf[8] & 0x3F) | 0x80;
    const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // 最后兜底（不强随机，但至少不报错）
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function newMessageId() {
  return safeUUID();
}

/** 统一换行；收束行尾多余 `|`，便于 GFM 表格被前端解析 */
function normalizeSseMarkdownText(md: string): string {
  return md
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .split('\n')
    .map((line) => line.trimEnd().replaceAll(/\|{2,}\s*$/g, '|'))
    .join('\n');
}

function normalizeRichMarkdownParts(
  parts: AiChatAssistantMessagePart[],
): AiChatAssistantMessagePart[] {
  return parts.map((p) =>
    p.type === 'markdown'
      ? { ...p, content: normalizeSseMarkdownText(p.content ?? '') }
      : p,
  );
}

function parseChartPayload(payload: Record<string, unknown>): null | {
  chartConfig: AiChatAssistantChartConfig;
  chartData: Record<string, unknown>[];
} {
  const chartConfigRaw =
    typeof payload.chartConfig === 'object' && payload.chartConfig
      ? (payload.chartConfig as Record<string, unknown>)
      : null;
  const chartData = Array.isArray(payload.chartData)
    ? (payload.chartData as Record<string, unknown>[])
    : [];
  if (!chartConfigRaw) return null;

  const chartType =
    chartConfigRaw.type === 'bar' || chartConfigRaw.type === 'line'
      ? chartConfigRaw.type
      : null;
  const xAxis =
    typeof chartConfigRaw.xAxis === 'string' ? chartConfigRaw.xAxis : null;
  const yAxis =
    typeof chartConfigRaw.yAxis === 'string' ? chartConfigRaw.yAxis : null;
  const title =
    typeof chartConfigRaw.title === 'string' ? chartConfigRaw.title : undefined;
  const dataPath =
    typeof chartConfigRaw.dataPath === 'string'
      ? chartConfigRaw.dataPath
      : undefined;
  const fields = Array.isArray(chartConfigRaw.fields)
    ? chartConfigRaw.fields
        .filter((v): v is string => typeof v === 'string')
        .filter(Boolean)
    : undefined;

  if (!chartType || !xAxis || !yAxis) return null;

  return {
    chartConfig: {
      type: chartType,
      title,
      xAxis,
      yAxis,
      dataPath,
      fields,
    },
    chartData,
  };
}

function feedbackStatusFromRestore(
  raw: unknown,
): 'dislike' | 'like' | null | undefined {
  if (raw === 'like' || raw === 'dislike') return raw;
  if (raw === null) return null;
  return undefined;
}

export const useAiAssistantChatStore = defineStore('ai-assistant-chat', () => {
  // UI state
  const open = ref(false);
  const viewMode = ref<ViewMode>('right');
  const panelMode = ref<PanelMode>('chat');

  // Chat state
  const activeConversationId = ref<null | string>(null);
  const historyItems = ref<AiAssistantHistoryItem[]>([]);
  const historySessionsLoading = ref(false);
  const chatMessages = ref<AiChatMessage[]>([]);
  const assistantMetaById = ref<Record<string, AssistantMessageMeta>>({});

  // pending / thinking
  const sendLoading = ref(false);
  const isThinking = ref(false);
  const streamingAssistantMessageId = ref<null | string>(null);

  // SSE
  const currentEventSource = ref<EventSource | null>(null);

  const title = computed(() =>
    panelMode.value === 'history' ? '历史对话' : '小曦助手',
  );

  const accessStore = useAccessStore();

  function ensureWelcomeMessage() {
    if (activeConversationId.value) return;
    if (chatMessages.value.length > 0) return;
    chatMessages.value = [
      {
        id: newMessageId(),
        kind: 'rich',
        role: 'assistant',
        parts: [{ type: 'markdown', content: WELCOME_TEXT }],
      },
    ];
  }

  function ensureRichAssistantMessage(
    messageId: string,
  ): AiChatAssistantRichMessage {
    const existing = chatMessages.value.find((m) => m.id === messageId);
    if (existing && existing.role === 'assistant' && existing.kind === 'rich') {
      return existing;
    }
    const next: AiChatAssistantRichMessage = {
      id: messageId,
      kind: 'rich',
      role: 'assistant',
      parts: [],
    };
    chatMessages.value = chatMessages.value.map((m) =>
      m.id === messageId ? next : m,
    );
    return next;
  }

  function applySsePayload(
    messageId: string,
    payload: unknown,
    options?: { finalizeStream?: boolean },
  ) {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as Record<string, unknown>;
    const type = typeof p.type === 'string' ? p.type : '';

    if (type === 'chart') {
      const parsed = parseChartPayload(p);
      if (!parsed) return;
      const rich = ensureRichAssistantMessage(messageId);
      const nextChartPart = {
        type: 'chart' as const,
        chartConfig: parsed.chartConfig,
        chartData: parsed.chartData,
      };
      const nextParts = (() => {
        const idx = rich.parts.findIndex((part) => part.type === 'chart');
        if (idx === -1) return [nextChartPart, ...rich.parts];
        return rich.parts.map((part, i) => (i === idx ? nextChartPart : part));
      })();

      chatMessages.value = chatMessages.value.map((m) => {
        if (m.id !== messageId) return m;
        if (m.role !== 'assistant') return m;
        if (m.kind !== 'rich') return m;
        return { ...m, parts: nextParts };
      });

      isThinking.value = false;
      return;
    }

    if (type === 'thinking') {
      const meta =
        assistantMetaById.value[messageId] ?? ensureAssistantMeta(messageId);
      const step =
        p.step === null || p.step === undefined ? '' : String(p.step);
      const content =
        typeof p.thinkingContent === 'string' ? p.thinkingContent : '';
      const rawStatus =
        typeof p.thinkingStatus === 'string' ? p.thinkingStatus : 'thinking';
      const status = (rawStatus || 'thinking') as ThinkingStepStatus;

      const existingIdx = meta.thinking.steps.findIndex((s) => s.step === step);
      const nextSteps =
        existingIdx === -1
          ? [...meta.thinking.steps, { content, status, step }]
          : meta.thinking.steps.map((s, idx) => {
              if (idx !== existingIdx) return s;
              const nextContent =
                content && s.content
                  ? `${s.content}${content}`
                  : s.content || content;
              return { ...s, content: nextContent, status };
            });

      const thinkingFrameDone = rawStatus === 'done';
      const nextThinkingStatus: ThinkingStepStatus = (() => {
        if (status === 'error') return 'error';
        if (meta.thinking.status === 'error') return 'error';
        if (thinkingFrameDone) return 'done';
        return 'thinking';
      })();

      assistantMetaById.value = {
        ...assistantMetaById.value,
        [messageId]: {
          ...meta,
          thinkingFinished: thinkingFrameDone || meta.thinkingFinished,
          thinkingFinishedAt:
            thinkingFrameDone || meta.thinkingFinished
              ? (meta.thinkingFinishedAt ?? Date.now())
              : meta.thinkingFinishedAt,
          thinking: {
            ...meta.thinking,
            status: nextThinkingStatus,
            steps: nextSteps,
          },
        },
      };

      isThinking.value = !thinkingFrameDone;
      return;
    }

    if (type === 'token') {
      const raw = typeof p.content === 'string' ? p.content : '';
      const piece = raw.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
      if (!piece) return;

      const meta =
        assistantMetaById.value[messageId] ?? ensureAssistantMeta(messageId);
      assistantMetaById.value = {
        ...assistantMetaById.value,
        [messageId]: {
          ...meta,
          answer: { ...meta.answer, streaming: true },
        },
      };

      const rich = ensureRichAssistantMessage(messageId);
      const nextParts = (() => {
        const idx = rich.parts.findIndex((part) => part.type === 'markdown');
        if (idx === -1) {
          return [...rich.parts, { type: 'markdown' as const, content: piece }];
        }
        return rich.parts.map((part, i) => {
          if (i !== idx) return part;
          if (part.type !== 'markdown') return part;
          return { ...part, content: `${part.content ?? ''}${piece}` };
        });
      })();

      chatMessages.value = chatMessages.value.map((m) => {
        if (m.id !== messageId) return m;
        if (m.role !== 'assistant') return m;
        if (m.kind !== 'rich') return m;
        return { ...m, parts: nextParts };
      });

      isThinking.value = false;
      return;
    }

    if (type === 'done') {
      const meta =
        assistantMetaById.value[messageId] ?? ensureAssistantMeta(messageId);
      assistantMetaById.value = {
        ...assistantMetaById.value,
        [messageId]: {
          ...meta,
          qaFinished: true,
          answer: { ...meta.answer, streaming: false },
          thinking: {
            ...meta.thinking,
            endedAt: meta.thinking.endedAt ?? Date.now(),
            status: meta.thinking.status === 'error' ? 'error' : 'done',
          },
        },
      };
      isThinking.value = false;

      chatMessages.value = chatMessages.value.map((m) => {
        if (m.id !== messageId) return m;
        if (m.role !== 'assistant' || m.kind !== 'rich') return m;
        return { ...m, parts: normalizeRichMarkdownParts(m.parts) };
      });

      if (options?.finalizeStream) {
        streamingAssistantMessageId.value = null;
        disconnectEventSource();
      }
    }
  }

  function disconnectEventSource() {
    if (currentEventSource.value) {
      currentEventSource.value.close();
      currentEventSource.value = null;
    }
  }

  function closeSse() {
    disconnectEventSource();
    streamingAssistantMessageId.value = null;
    isThinking.value = false;
  }

  function isAssistantTurnBusy(messageId: string): boolean {
    const meta = assistantMetaById.value[messageId];
    if (meta?.qaFinished) return false;
    return true;
  }

  const pending = computed(() => {
    const msgId = streamingAssistantMessageId.value;
    if (sendLoading.value) return true;
    if (msgId && isAssistantTurnBusy(msgId)) return true;
    return isThinking.value;
  });

  function ensureAssistantMeta(messageId: string): AssistantMessageMeta {
    const existing = assistantMetaById.value[messageId];
    if (existing) return existing;
    const meta: AssistantMessageMeta = {
      answer: { streaming: false },
      qaFinished: false,
      thinkingFinished: false,
      thinking: {
        collapsed: false,
        startedAt: Date.now(),
        status: 'thinking',
        steps: [],
      },
    };
    assistantMetaById.value = { ...assistantMetaById.value, [messageId]: meta };
    return meta;
  }

  function toggleThinking(messageId: string) {
    const meta = assistantMetaById.value[messageId];
    if (!meta) return;
    assistantMetaById.value = {
      ...assistantMetaById.value,
      [messageId]: {
        ...meta,
        thinking: {
          ...meta.thinking,
          collapsed: !meta.thinking.collapsed,
        },
      },
    };
  }

  function connectSse(sessionId: string) {
    if (currentEventSource.value && activeConversationId.value === sessionId) {
      return;
    }
    // disconnectEventSource 只关连接；本轮发送仍依赖 streamingAssistantMessageId 将 SSE 路由到占位消息
    const currentStreamingMsgId = streamingAssistantMessageId.value;
    disconnectEventSource();
    if (currentStreamingMsgId) {
      streamingAssistantMessageId.value = currentStreamingMsgId;
    }
    const url = `/api${BASE_URL}/chat/stream/${encodeURIComponent(sessionId)}`;

    const es = new EventSourcePolyfill(url, {
      headers: {
        'DeFrame-Auth': `Bearer ${accessStore.accessToken}`,
      },
    });
    currentEventSource.value = es;

    function handleSsePayload(payload: unknown) {
      const msgId = streamingAssistantMessageId.value;
      if (!msgId) return;
      applySsePayload(msgId, payload, { finalizeStream: true });
    }

    // 兼容后端：不发 event:token/done，而是统一走 message，payload 内用 {type:'token'|'done'...}
    es.addEventListener('message', (e: Event) => {
      try {
        const raw = (e as MessageEvent<string>).data;
        handleSsePayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('chart', (e: Event) => {
      try {
        const raw = (e as MessageEvent<string>).data;
        handleSsePayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('thinking', (e: Event) => {
      try {
        const raw = (e as MessageEvent<string>).data;
        handleSsePayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('token', (e: Event) => {
      try {
        const raw = (e as MessageEvent<string>).data;
        handleSsePayload(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener('done', (e: Event) => {
      try {
        const raw = (e as MessageEvent<string>).data;
        if (raw) {
          handleSsePayload(JSON.parse(raw));
          return;
        }
      } catch {
        /* fall through */
      }
      handleSsePayload({ type: 'done' });
    });

    es.addEventListener('error', (e: Event) => {
      // 尝试从 e.data 中解析错误信息
      let errorMsg = 'SSE 连接异常';
      try {
        const raw = (e as MessageEvent<string>).data;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.error === 'string') {
            errorMsg = parsed.error;
          }
        }
      } catch {
        /* 解析失败时使用默认错误信息 */
      }

      const msgId = streamingAssistantMessageId.value;
      if (msgId) {
        const meta = ensureAssistantMeta(msgId);

        // 将错误信息添加到消息的 markdown parts 中
        const rich = ensureRichAssistantMessage(msgId);
        const nextParts = (() => {
          const idx = rich.parts.findIndex((part) => part.type === 'markdown');
          if (idx === -1) {
            return [
              ...rich.parts,
              { type: 'markdown' as const, content: errorMsg },
            ];
          }
          return rich.parts.map((part, i) => {
            if (i !== idx) return part;
            if (part.type !== 'markdown') return part;
            return { ...part, content: errorMsg };
          });
        })();

        chatMessages.value = chatMessages.value.map((m) => {
          if (m.id !== msgId) return m;
          if (m.role !== 'assistant') return m;
          if (m.kind !== 'rich') return m;
          return { ...m, parts: nextParts };
        });

        assistantMetaById.value = {
          ...assistantMetaById.value,
          [msgId]: {
            ...meta,
            answer: { ...meta.answer, streaming: false },
            qaFinished: true,
            thinking: {
              ...meta.thinking,
              endedAt: Date.now(),
              status: 'error',
            },
            thinkingFinished: true,
          },
        };
      }
      const busyMsgId = streamingAssistantMessageId.value;
      if (busyMsgId && isAssistantTurnBusy(busyMsgId)) {
        const meta = ensureAssistantMeta(busyMsgId);
        assistantMetaById.value = {
          ...assistantMetaById.value,
          [busyMsgId]: {
            ...meta,
            qaFinished: true,
            answer: { ...meta.answer, streaming: false },
            thinking: {
              ...meta.thinking,
              endedAt: Date.now(),
              status: 'error',
            },
          },
        };
      }
      // 仅关闭 SSE 连接，不关闭 Drawer/Fullscreen
      streamingAssistantMessageId.value = null;
      isThinking.value = false;
      disconnectEventSource();
      console.error(errorMsg);
    });
  }

  async function loadChatSessions() {
    historySessionsLoading.value = true;
    try {
      const list = await getChatSessionsApi();
      historyItems.value = list.map((s) => ({
        id: s.id,
        preview: s.title,
        // time: formatChatSessionListTime(s.updatedAt),
        time: s.updatedAt,
      }));
    } catch (error) {
      console.error(error);
      antdMessage.error('加载历史会话失败');
      historyItems.value = [];
    } finally {
      historySessionsLoading.value = false;
    }
  }

  function openPanel() {
    open.value = true;
    viewMode.value = 'right';
    panelMode.value = 'chat';
    ensureWelcomeMessage();
  }

  function closePanel() {
    open.value = false;
    // 关闭后再打开应进入新对话：清空会话、停止 SSE、回到聊天 Tab
    newChat();
  }

  function newChat() {
    activeConversationId.value = null;
    chatMessages.value = [];
    panelMode.value = 'chat';
    closeSse();
    ensureWelcomeMessage();
  }

  function toggleView() {
    viewMode.value = viewMode.value === 'right' ? 'full' : 'right';
  }

  function openHistory() {
    panelMode.value = 'history';
    void loadChatSessions();
  }

  function goChat() {
    panelMode.value = 'chat';
  }

  async function selectConversation(id: string) {
    closeSse();
    activeConversationId.value = id;
    panelMode.value = 'chat';
    try {
      const res = await postChatRestoreApi(id);
      assistantMetaById.value = {};
      chatMessages.value = [];

      for (const h of res.history) {
        if (h.role === 'user') {
          chatMessages.value.push({
            id: h.messageId ?? newMessageId(),
            role: 'user',
            text: h.content,
          });
          continue;
        }

        const replayMsgId = h.messageId ?? newMessageId();
        chatMessages.value.push({
          id: replayMsgId,
          kind: 'rich',
          role: 'assistant',
          parts: [],
        });
        ensureAssistantMeta(replayMsgId);

        const events = Array.isArray(h.sseEvents) ? h.sseEvents : [];
        for (const e of events) {
          applySsePayload(replayMsgId, e, { finalizeStream: false });
        }

        const restoredFeedback = feedbackStatusFromRestore(h.feedbackStatus);
        if (restoredFeedback !== undefined) {
          const metaAfter = assistantMetaById.value[replayMsgId];
          if (metaAfter) {
            assistantMetaById.value = {
              ...assistantMetaById.value,
              [replayMsgId]: {
                ...metaAfter,
                feedbackStatus: restoredFeedback,
              },
            };
          }
        }
      }

      if (chatMessages.value.length === 0) ensureWelcomeMessage();
      isThinking.value = false;
    } catch (error) {
      console.error(error);
      antdMessage.error('恢复会话失败');
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    const busyId = streamingAssistantMessageId.value;
    if (
      !trimmed ||
      sendLoading.value ||
      (busyId ? isAssistantTurnBusy(busyId) : false)
    ) {
      return;
    }
    sendLoading.value = true;
    const assistantMsgId = newMessageId();
    streamingAssistantMessageId.value = assistantMsgId;
    chatMessages.value = [
      ...chatMessages.value,
      { id: newMessageId(), role: 'user', text: trimmed },
      { id: assistantMsgId, kind: 'rich', role: 'assistant', parts: [] },
    ];
    ensureAssistantMeta(assistantMsgId);
    try {
      const data = await postChatSendApi({
        message: trimmed,
        sessionId: activeConversationId.value ?? undefined,
      });
      activeConversationId.value = data.sessionId;
      connectSse(data.sessionId);
    } catch (error) {
      console.error(error);
      // /chat/send 失败：结束本轮状态，小助手不输出（移除空的 assistant 占位消息与 meta）
      streamingAssistantMessageId.value = null;
      isThinking.value = false;
      const { [assistantMsgId]: _removed, ...rest } = assistantMetaById.value;
      assistantMetaById.value = rest;
      chatMessages.value = chatMessages.value.filter(
        (m) => m.id !== assistantMsgId,
      );
    } finally {
      sendLoading.value = false;
    }
  }

  function deleteConversationLocalOnly(id: string) {
    historyItems.value = historyItems.value.filter((i) => i.id !== id);
    if (activeConversationId.value === id) activeConversationId.value = null;
  }

  async function deleteConversation(id: string) {
    try {
      await deleteChatSessionApi(id);
      const wasActive = activeConversationId.value === id;

      deleteConversationLocalOnly(id);

      if (wasActive) {
        closeSse();
        chatMessages.value = [];
        assistantMetaById.value = {};
        ensureWelcomeMessage();
      }

      antdMessage.success('已删除会话');
    } catch (error) {
      console.error(error);
      antdMessage.error('删除会话失败');
    }
  }

  async function submitFeedback(payload: {
    messageId?: string;
    type: 'dislike' | 'like';
  }) {
    const sessionId = activeConversationId.value;
    if (!sessionId) {
      antdMessage.warning('暂无会话，无法提交反馈');
      return;
    }
    try {
      await postChatFeedbackApi({
        sessionId,
        messageId: payload.messageId,
        type: payload.type,
      });
      if (payload.messageId) {
        const mid = payload.messageId;
        const meta = assistantMetaById.value[mid];
        if (meta) {
          assistantMetaById.value = {
            ...assistantMetaById.value,
            [mid]: { ...meta, feedbackStatus: payload.type },
          };
        }
      }
      antdMessage.success(payload.type === 'like' ? '已赞成' : '已反馈');
    } catch (error) {
      console.error(error);
      antdMessage.error('提交反馈失败');
    }
  }

  return {
    // state
    open,
    viewMode,
    panelMode,
    title,
    activeConversationId,
    historyItems,
    historySessionsLoading,
    chatMessages,
    assistantMetaById,
    pending,

    // actions
    openPanel,
    closePanel,
    newChat,
    toggleView,
    openHistory,
    goChat,
    loadChatSessions,
    selectConversation,
    sendMessage,
    deleteConversationLocalOnly,
    deleteConversation,
    toggleThinking,
    submitFeedback,
  };
});
