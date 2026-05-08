import type { AiChatMessage } from '../types';

/** 未接后端时用于 UI 联调的默认对话片段（与 ChatPanel 展示一致） */
export const AI_ASSISTANT_DEMO_MESSAGES: AiChatMessage[] = [
  {
    id: 'm_welcome',
    kind: 'text',
    role: 'assistant',
    text: '你好！我是小羲助手。我将为你提供专业的能源互联网支持。',
  },
  {
    id: 'm_user_1',
    role: 'user',
    text: '帮我分析一下近期负荷数据。',
  },
  {
    id: 'm_card_1',
    kind: 'card',
    role: 'assistant',
    subtitle: '点击查看详细数据分析',
    title: '生成实时负荷预测图表',
  },
];
