/**
 * AI 小助手 /api/chat 接口（与 src/ai-assistant/api-contract.md 对齐）
 * 由 vite 将 /api/chat 代理至 VITE_DEV_PROXY_TARGET_AI_ASSISTANT
 *
 * 认证走 requestClient 的 DEFrame-Auth 等；本地联调时临时附带租户/用户头（与网关约定大小写见下行），上线前删除下面 DEV 逻辑。
 */
import dayjs from 'dayjs';

import { requestClient } from '#/api/request';

/** 仅开发环境；后端联调结束后删除本常量在调用处的合并 */
const CHAT_DEV_FRAME_STUB_HEADERS: Record<string, string> = {
  'DEFrame-TenantId': 'tenant_001',
  'DEFrame-UserId': 'user_001',
};

export const BASE_URL = '/ai-assistant/external/private/api';

type ViteImportMeta = ImportMeta & { env: { DEV: boolean; PROD: boolean } };

function chatRequestOptions() {
  if (
    (import.meta as ViteImportMeta).env.PROD ||
    (import.meta as ViteImportMeta).env.DEV
  ) {
    return {};
  }
  return { headers: { ...CHAT_DEV_FRAME_STUB_HEADERS } };
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: string;
  agentId: string;
  agentName: string;
}

/**
 * 获取当前用户的会话列表（摘要）
 * GET /api/chat/sessions
 */
export function getChatSessionsApi(): Promise<ChatSessionSummary[]> {
  return requestClient.get<ChatSessionSummary[]>(
    `${BASE_URL}/chat/sessions`,
    chatRequestOptions(),
  );
}

export interface PostChatSendBody {
  message?: string;
  sessionId?: string;
  agentId?: string;
}

/** POST /api/chat/send 的 data 字段 */
export interface PostChatSendData {
  sessionId: string;
  taskId?: string;
}

/**
 * 发送消息并创建/续接会话
 * POST /api/chat/send — 新会话时不传 body.sessionId
 */
export function postChatSendApi(
  body?: PostChatSendBody,
): Promise<PostChatSendData> {
  const data: { agentId?: string; message?: string; sessionId?: string } = {};
  if (body?.message) {
    data.message = body.message;
  }
  if (body?.sessionId) {
    data.sessionId = body.sessionId;
  }
  if (body?.agentId) {
    data.agentId = body.agentId;
  }
  return requestClient.post<PostChatSendData>(
    `${BASE_URL}/chat/send`,
    data,
    chatRequestOptions(),
  );
}

export type ChatHistoryFeedbackStatus = 'dislike' | 'like' | null;

export interface ChatHistoryItemRest {
  content: string;
  /** 后端消息 id（用于回放/反馈等） */
  messageId?: string;
  role: 'assistant' | 'user';
  /** assistant：该条是否已提交反馈（restore 回显） */
  feedbackStatus?: ChatHistoryFeedbackStatus;
  /** assistant 侧可选：与实时 SSE 帧一致的事件列表 */
  sseEvents?: Array<Record<string, unknown>>;
}

export interface PostChatRestoreData {
  history: ChatHistoryItemRest[];
  sessionId: string;
  title: string;
}

/**
 * 恢复历史会话
 * POST /api/chat/sessions/{sessionId}/restore
 */
export function postChatRestoreApi(
  sessionId: string,
): Promise<PostChatRestoreData> {
  return requestClient.post<PostChatRestoreData>(
    `${BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}/restore`,
    {},
    { ...chatRequestOptions() },
  );
}

/**
 * 删除会话
 * DELETE /api/chat/sessions/{sessionId}
 */
export function deleteChatSessionApi(sessionId: string): Promise<null> {
  return requestClient.delete<null>(
    `${BASE_URL}/chat/sessions/${encodeURIComponent(sessionId)}`,
    chatRequestOptions(),
  );
}

export type ChatFeedbackType = 'dislike' | 'like';

export interface PostChatFeedbackBody {
  messageId?: string;
  sessionId: string;
  type: ChatFeedbackType;
}

/**
 * 提交反馈（点赞/点踩）
 * POST /api/chat/feedback
 */
export function postChatFeedbackApi(body: PostChatFeedbackBody): Promise<null> {
  const data: PostChatFeedbackBody = {
    sessionId: body.sessionId,
    type: body.type,
  };
  if (body.messageId) {
    data.messageId = body.messageId;
  }
  return requestClient.post<null>(
    `${BASE_URL}/chat/feedback`,
    data,
    chatRequestOptions(),
  );
}

export function formatChatSessionListTime(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) {
    return '';
  }
  return d.format('MM-DD HH:mm');
}

/** Agent 信息 */
export interface ChatAgentItem {
  agentId: string;
  name: string;
  description: string;
  icon: null | string;
}

/** Agent 列表响应 */
export interface ChatAgentsResponse {
  code: string;
  message: null | string;
  data: ChatAgentItem[];
  ext: null;
  success: boolean;
}

/**
 * 获取 Agent 列表
 * GET /api/chat/agents
 * requestClient 已解包为 data 数组，类型为 ChatAgentItem[]
 */
export function getChatAgentsApi(): Promise<ChatAgentItem[]> {
  return requestClient.get<ChatAgentItem[]>(
    `${BASE_URL}/chat/agents`,
    chatRequestOptions(),
  );
}

/** GET /chat/agents/{agentId}/welcome — data.welcomeMessage */
export interface ChatAgentWelcomeData {
  welcomeMessage: string;
}

/**
 * 获取 Agent 欢迎语
 * GET /chat/agents/{agentId}/welcome
 */
export function getChatAgentWelcomeApi(
  agentId: string,
): Promise<ChatAgentWelcomeData> {
  return requestClient.get<ChatAgentWelcomeData>(
    `${BASE_URL}/chat/agents/${encodeURIComponent(agentId)}/welcome`,
    chatRequestOptions(),
  );
}

/** GET /chat/agents/{agentId}/questions — data.questions */
export interface ChatAgentQuestionsData {
  questions: string[];
}

/**
 * 获取 Agent 推荐问题
 * GET /chat/agents/{agentId}/questions
 */
export function getChatAgentQuestionsApi(
  agentId: string,
): Promise<ChatAgentQuestionsData> {
  return requestClient.get<ChatAgentQuestionsData>(
    `${BASE_URL}/chat/agents/${encodeURIComponent(agentId)}/questions`,
    chatRequestOptions(),
  );
}
