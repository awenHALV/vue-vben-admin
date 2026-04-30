export type AiAssistantHistoryItem = {
  id: string;
  preview: string;
  time: string;
};

export type AiAssistantPanelVariant = 'drawer' | 'fullscreen';

/** 单条聊天展示（由 REST 列表或 SSE 流拼装后传入 UI） */
export type AiChatUserMessage = {
  id: string;
  role: 'user';
  text: string;
};

export type AiChatAssistantTextMessage = {
  id: string;
  kind: 'text';
  role: 'assistant';
  text: string;
};

export type AiChatAssistantCardMessage = {
  id: string;
  kind: 'card';
  role: 'assistant';
  subtitle?: string;
  title: string;
};

export type AiChatAssistantChartConfig = {
  /** 兼容后端/协议：允许前端无需硬编码取数路径 */
  dataPath?: string;
  /** 兼容后端/协议：允许前端无需硬编码字段 */
  fields?: string[];
  title?: string;
  type: 'bar' | 'line' | 'pie';
  xAxis: string;
  yAxis: string;
};

export type AiChatAssistantMessagePartChart = {
  chartConfig: AiChatAssistantChartConfig;
  chartData: Record<string, unknown>[];
  type: 'chart';
};

export type AiChatAssistantMessagePartMarkdown = {
  content: string;
  type: 'markdown';
};

export type AiChatAssistantMessagePart =
  | AiChatAssistantMessagePartChart
  | AiChatAssistantMessagePartMarkdown;

export type AiChatAssistantRichMessage = {
  id: string;
  kind: 'rich';
  parts: AiChatAssistantMessagePart[];
  role: 'assistant';
};

export type AiChatMessage =
  | AiChatAssistantCardMessage
  | AiChatAssistantRichMessage
  | AiChatAssistantTextMessage
  | AiChatUserMessage;
