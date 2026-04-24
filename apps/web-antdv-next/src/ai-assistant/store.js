import { computed, nextTick, ref } from 'vue';

import {
  createSseStream,
  getSessions,
  restoreSession,
  sendMessage,
} from '@/api';
import { defineStore } from 'pinia';

export const useChatStore = defineStore('chat', () => {
  // State
  const sessions = ref([]);
  const currentSessionId = ref(null);
  const messages = ref([]);
  const streaming = ref(false);
  const pendingApprovals = ref([]);

  let activeSse = null;
  const pendingSkillCalls = new Set();
  let thinkStartTime = null; // 记录思考开始时间

  // Getters
  const currentSession = computed(
    () => sessions.value.find((s) => s.id === currentSessionId.value) || null,
  );

  // Actions

  /**
   * 发送消息，并建立 SSE 订阅接收流式响应。
   */
  async function send(message, tenantId, userId) {
    if (streaming.value) return;

    streaming.value = true;
    thinkStartTime = Date.now(); // 记录思考开始时间

    // 添加用户消息
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    messages.value.push(userMsg);

    // 创建 AI 占位消息（流式追加 content）
    const aiMsg = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      skillCalls: [],
      pendingApproval: null,
      thinking: {
        status: 'thinking',
        steps: [],
      },
    };
    messages.value.push(aiMsg);

    // 发送请求
    const result = await sendMessage({
      sessionId: currentSessionId.value,
      message,
      tenantId,
      userId,
    });

    // 兼容后端 R<T> 包装格式：{code, message, data: {sessionId}}
    const sessionId = result.data?.sessionId || result.sessionId;

    currentSessionId.value = sessionId;

    // 确保会话在列表中
    if (!sessions.value.some((s) => s.id === sessionId)) {
      sessions.value.unshift({
        id: sessionId,
        title: message.slice(0, 30),
        lastMessage: message,
        updatedAt: new Date().toISOString(),
      });
    }

    // 建立 SSE 流
    if (activeSse) {
      activeSse.close();
    }

    activeSse = createSseStream(
      sessionId,
      tenantId,
      (type, payload) => {
        switch (type) {
          case 'approval': {
            aiMsg.pendingApproval = {
              approvalId: payload.approvalId,
              processKey: payload.processKey,
              description: payload.description,
            };
            pendingApprovals.value.push(aiMsg.pendingApproval);
            break;
          }

          case 'done': {
            console.warn('[SSE] 收到 done 事件', payload);
            streaming.value = false;
            if (aiMsg.thinking.status !== 'error') {
              aiMsg.thinking.status = 'done';
              // 计算思考耗时
              if (thinkStartTime) {
                const elapsed = Math.round(
                  (Date.now() - thinkStartTime) / 1000,
                );
                aiMsg.thinking.elapsed = elapsed;
                console.warn('[SSE] 计算耗时:', elapsed, '秒');
                thinkStartTime = null;
              }
              // 强制触发 Vue 响应式更新
              nextTick(() => {
                console.warn('[SSE] UI 更新完成');
              });
            }
            pendingSkillCalls.clear();
            break;
          }

          case 'error': {
            aiMsg.content = `错误: ${payload.error || '未知错误'}`;
            aiMsg.thinking.status = 'error';
            streaming.value = false;
            pendingSkillCalls.clear();
            break;
          }

          case 'skillCall': {
            if (payload.status === 'executing') {
              pendingSkillCalls.add(payload.skillName);
              aiMsg.skillCalls.push({
                name: payload.skillName,
                status: 'executing',
              });
            } else {
              pendingSkillCalls.delete(payload.skillName);
            }
            break;
          }

          case 'thinking': {
            // payload: { step, thinkingContent, thinkingStatus }
            if (aiMsg.thinking.steps.some((s) => s.step === payload.step)) {
              const step = aiMsg.thinking.steps.find(
                (s) => s.step === payload.step,
              );
              step.content = payload.thinkingContent;
              step.status = payload.thinkingStatus;
            } else {
              aiMsg.thinking.steps.push({
                step: payload.step,
                content: payload.thinkingContent,
                status: payload.thinkingStatus,
              });
            }
            // 根据步骤状态决定整体状态：error 优先
            if (payload.thinkingStatus === 'error') {
              aiMsg.thinking.status = 'error';
            } else if (
              payload.thinkingStatus === 'done' &&
              aiMsg.thinking.status !== 'error'
            ) {
              aiMsg.thinking.status = 'done';
            }
            break;
          }

          case 'token': {
            aiMsg.content += payload.content;
            break;
          }
        }
      },
      () => {
        streaming.value = false;
        pendingSkillCalls.clear();
      },
    );
  }

  /**
   * 切换到指定会话（从 PostgreSQL 加载历史到 Redis）。
   */
  async function switchSession(sessionId, tenantId) {
    if (activeSse) {
      activeSse.close();
      activeSse = null;
    }
    currentSessionId.value = sessionId;
    messages.value = [];
    streaming.value = false;
    pendingApprovals.value = [];

    if (!sessionId || !tenantId) return;

    try {
      const result = await restoreSession(sessionId, tenantId);
      if (result.code === '200' && result.data) {
        const { history } = result.data;
        if (history && history.length > 0) {
          messages.value = history.map((msg, _idx) => ({
            id: crypto.randomUUID(),
            role: msg.role,
            content: msg.content,
            createdAt: msg.createdAt,
            skillCalls: msg.skillId
              ? [{ name: msg.skillId, status: 'done' }]
              : [],
            pendingApproval: null,
          }));
        }
      }
    } catch (error) {
      console.error('加载会话历史失败', error);
    }
  }

  function newSession() {
    if (activeSse) {
      activeSse.close();
      activeSse = null;
    }
    currentSessionId.value = null;
    messages.value = [];
    streaming.value = false;
    pendingApprovals.value = [];
  }

  async function loadSessions(userId, tenantId) {
    try {
      const result = await getSessions(userId, tenantId);
      if (result.code === '200') {
        sessions.value = (result.data || []).map((s) => ({
          id: s.id,
          title: s.title || '新会话',
          updatedAt: s.updatedAt,
        }));
      }
    } catch (error) {
      console.error('加载会话列表失败', error);
    }
  }

  return {
    sessions,
    currentSessionId,
    messages,
    streaming,
    pendingApprovals,
    currentSession,
    send,
    switchSession,
    newSession,
    loadSessions,
  };
});
