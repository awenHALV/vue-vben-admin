# AI-Assistant 接口文档

> **版本**: v1.0 Phase 1
> **基础路径**: `/api/chat`
> **认证方式**: Header 传递 tenantId / userId（通过 PrincipalContext）

---

## 统一请求头

所有接口（除 SSE 流外）均需携带以下请求头：

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |
| `DEFrame-UserId` | 是 | 用户 ID |
| `DEFrame-Language` | 否 | 语言，默认 `zh-CN` |

---

## 统一响应格式

所有接口统一使用 `R<T>` 包装：

```json
{
  "code": "200",
  "message": null,
  "data": { ... },
  "ext": null
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | String | 状态码，**成功恒为字符串 `200`**；失败时取值为下表「错误码」中的业务码（勿用数字 `200` 比较） |
| `message` | String | 错误信息（失败时返回；成功时多为 `null`） |
| `data` | Object | 响应数据 |
| `ext` | Object | 扩展字段 |

---

## 1. SSE 流式连接

### GET `/api/chat/stream/{sessionId}`

建立 SSE 连接，接收 AI 响应的流式事件。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 是 | 会话 ID |

**请求头：**

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |

**响应：** SSE 流，事件类型如下：

#### token 事件（AI 回复片段）
```json
event: token
data: {"type":"token","content":"曙光电站今天的"}
```

#### skillCall 事件（技能调用状态）
```json
event: skillCall
data: {"type":"skillCall","skillId":"get-station-power-data","skillName":"get-station-power-data","status":"executing"}
```
- `status`: `executing` | `done` | `error`

#### thinking 事件（思考进度）
```json
event: thinking
data: {"type":"thinking","step":"意图识别","thinkingContent":"正在分析您的需求...","thinkingStatus":"thinking"}
```
- `thinkingStatus`: `thinking` | `done` | `error`

#### approval 事件（需要审批）
```json
event: approval
data: {"type":"approval","approvalId":"xxx","processKey":"approve_skill","description":"需要审批"}
```

#### done 事件（完成）
```json
event: done
data: {"type":"done","totalTokens":320}
```

#### error 事件（错误）
```json
event: error
data: {"type":"error","error":"会话不存在: xxx"}
```

---

## 2. 发送消息

### POST `/api/chat/send`

发送消息，触发 AI 异步处理，建立 SSE 连接接收响应。

**请求体：**

```json
{
  "sessionId": "uuid-or-null",
  "message": "曙光电站今天发电量多少？"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 否 | 会话 ID，空或不传则创建新会话 |
| message | String | 是 | 用户消息，最大 2000 字符 |

**首屏入口（小助手）**：从全局入口进入并提交**首条**对话时，请求体**不传 `sessionId`（可省略该字段）**，仅传 `message`（用户已输入/发送的文案），用于创建会话并建立后续 SSE；与 **§9.0** 一致。

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": {
    "sessionId": "abc-123-def",
    "taskId": "abc-123-def"
  }
}
```

**错误响应（输入被拦截）：**

```json
{
  "code": "chat_validation_error",
  "message": "输入包含非法内容"
}
```

---

## 3. 会话列表

### GET `/api/chat/sessions`

获取用户的会话列表摘要。

**调用时机（前端）**：用于「会话历史」列表 UI；用户点击**「会话历史」**再请求。**不要**在小助手首屏打开时自动调用。首屏建立对话见 **POST /send**（**§9.0、§2**）。

**请求头：**

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |
| `DEFrame-UserId` | 是 | 用户 ID |

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": [
    {
      "id": "session-uuid-1",
      "title": "曙光电站今天发电量多少？",
      "updatedAt": "2026-04-20T10:30:00"
    }
  ]
}
```

---

## 4. 删除会话

### DELETE `/api/chat/sessions/{sessionId}`

删除指定会话。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 是 | 会话 ID |

**请求头：**

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": null
}
```

**错误响应：**

```json
{
  "code": "SESSION_NOT_FOUND",
  "message": "会话不存在或无权访问"
}
```

---

## 5. 获取历史消息

### GET `/api/chat/history/{sessionId}`

从 PostgreSQL JSONB 展开消息历史。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 是 | 会话 ID |

**请求头：**

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": [
    {
      "role": "user",
      "content": "曙光电站今天发电量多少？",
      "skillId": null,
      "tokensUsed": null,
      "modelName": null
    },
    {
      "role": "assistant",
      "content": "曙光电站今天的实时功率为 520 kW",
      "skillId": "get-station-power-data",
      "tokensUsed": 320,
      "modelName": "deepseek-chat"
    }
  ]
}
```

---

## 6. 恢复会话

### POST `/api/chat/sessions/{sessionId}/restore`

从 PostgreSQL 加载历史会话到 Redis，支持续聊。

**典型调用（前端）**：在**会话历史**中选中某会话、或从列表切回**已有会话**时，用本接口将历史载入对话区以续聊（与 **GET /sessions** 拉列表是不同步接口）。**小助手首屏主路径**为 **POST /send**（可不传 `sessionId` 发首条消息），**不是**本 `restore`；`GET /api/chat/sessions` 仍仅在点「会话历史」时调。见 **§9.0、§9.2、§9.3**。

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 是 | 会话 ID |

**请求头：**

| Header | 必填 | 说明 |
|--------|------|------|
| `DEFrame-TenantId` | 是 | 租户 ID |
| `X-User-Id` | 是 | 用户 ID（用于权限校验） |

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": {
    "sessionId": "session-uuid",
    "title": "曙光电站今天发电量多少？",
    "history": [...]
  }
}
```

**错误响应：**

```json
{
  "code": "SESSION_NOT_FOUND",
  "message": "会话不存在或无权访问"
}
```

---

## 7. 提交反馈

### POST `/api/chat/feedback`

提交用户对 AI 回复的反馈（点赞/点踩）。

**请求体：**

```json
{
  "sessionId": "session-uuid",
  "messageId": "message-uuid",
  "type": "like"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | String | 是 | 会话 ID |
| messageId | String | 否 | 消息 ID |
| type | String | 是 | 反馈类型：`like` 或 `dislike` |

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": null
}
```

---

## 8. 获取当前用户

### GET `/api/chat/current-user`

获取当前用户上下文信息。

**响应：**

```json
{
  "code": "200",
  "message": null,
  "data": {
    "userId": "user_001",
    "tenantId": "tenant_001",
    "traceId": "trace-xxx",
    "language": "zh-CN"
  }
}
```

---

## 错误码

> **约定**：下文为 `/api/chat` 各接口 `R<T>` 中 **`code` 字段**的完整枚举（与后端「错误码」一致）。  
> 前端对返回体做成功/失败判断时，**仅以本表为准**：先判断成功码，再按业务码分支；**未在本表列出的 `code`** 使用 `message` 原样或通用兜底提示。

| 错误码 | 说明 | 建议用户提示（可 i18n） |
|--------|------|-------------------------|
| `200` | 成功 | —（走 `data` 业务数据） |
| `SESSION_NOT_FOUND` | 会话不存在或无权访问 | 会话不存在或无权访问 |
| `PARAM_MISSING` | 必要参数缺失 | 缺少必要参数 |
| `chat_validation_error` | 输入内容被安全检查拦截 | 输入包含非法内容 |

### 前端判断约定

1. **成功**：`String(data.code) === '200'`（兼容部分网关对 `code` 的类型差异时，可先 `String()`）。
2. **失败**：`data.code` 不为 `200` 时，按上表「错误码」列做 `switch` 或字典映射；**不得**硬编码未在表中定义的业务码作为主流程分支（未识别码走 `default`，展示 `data.message`）。
3. **HTTP 层**：若请求未到达业务体（网络错误、5xx、网关超时等），无 `data.code`，应单独处理，不与此表混用。

---

## SSE 前端示例

```javascript
const eventSource = new EventSource(`/api/chat/stream/${sessionId}?tenantId=${tenantId}`);

eventSource.addEventListener('token', (e) => {
  const { content } = JSON.parse(e.data);
  appendToMessage(content);
});

eventSource.addEventListener('skillCall', (e) => {
  const { skillName, status } = JSON.parse(e.data);
  showSkillBadge(skillName, status);
});

eventSource.addEventListener('done', (e) => {
  streaming = false;
});

eventSource.addEventListener('error', (e) => {
  const { error } = JSON.parse(e.data);
  showError(error);
});
```

---

## 9. 前端调用流程

### 9.0 从小助手入口进入（首屏：先 `POST /send` 建连，不拉列表）

用户从**全局小助手入口**进入并**发送首条内容**时，用 **`POST /api/chat/send`** 建立后端会话与后续流式能力，**不要**先调 `restore`、也**不要**在打开瞬间拉会话列表。

- **须调用（首条）**：`POST /api/chat/send`，请求体**不传 `sessionId`**（可省略该字段或置空），**`message` 为当前用户要发送的文案**（即用户已输入/确认发送的内容）。
- **不要调用**：小助手**刚打开、尚未发首条**时，若产品未设计「开屏自动发信」，则**不**发 `/send`；一旦用户提交首条，再按上条调用。**打开瞬间**不要请求 `GET /api/chat/sessions`。
- **会话列表**：`GET /api/chat/sessions` 仅用户点击**「会话历史」**时调用，用于展示历史摘要列表，与首屏**解耦**。
- **恢复会话** `POST .../restore`：用于在**历史列表/切换会话**等场景下载入**已有** `sessionId` 的上下文，**不是**首屏默认第一步（见 **§9.2**）。

成功响应含 `data.sessionId` 后，再 **`GET /api/chat/stream/{sessionId}`** 建立 SSE，接收流式事件（同 **§9.1**）。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 小助手首屏：用户从入口发首条消息                            │
└─────────────────────────────────────────────────────────────────────────┘

1. 用户点击小助手入口，打开对话面板（可展示欢迎/输入框，不调列表）
   ↓
2. 用户输入并确认发送首条（message = 用户发送的内容）
   ↓
3. 调用 POST /api/chat/send
   Body: { "message": "<用户内容>" }   // 不传 sessionId
   ↓
4. 后端返回 { "code":"200", "data":{ "sessionId","taskId" } }
   ↓
5. 用 sessionId 建立 GET /api/chat/stream/{sessionId}（SSE），收 token / done …
   ↓
6. 仍不在此阶段调用 GET /api/chat/sessions
   ↓
7. 用户点击「会话历史」时，再 GET /api/chat/sessions
```

---

### 9.1 新建会话并发送消息

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          新建会话流程                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. 用户点击「新建会话」
   ↓
2. 前端调用 POST /api/chat/send
   Headers: DEFrame-TenantId, X-User-Id
   Body: { "message": "曙光电站今天发电量多少？" }
   ↓
3. 后端返回
   {
     "code": "200",
     "data": {
       "sessionId": "abc-123-def"
     }
   }
   ↓
4. 前端建立 SSE 连接
   GET /api/chat/stream/abc-123-def
   Headers: DEFrame-TenantId
   ↓
5. 前端接收 SSE 事件：
   - thinking 事件 → 显示思考进度（展开思维链）
   - skillCall 事件 → 显示技能徽章
   - token 事件 → 追加到 AI 消息
   - done 事件 → 关闭流式状态
   - error 事件 → 显示错误
   ↓
6. 完成
```

**代码示例：**

```javascript
// API 封装（统一添加请求头）
const apiClient = {
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'DEFrame-TenantId': localStorage.getItem('tenantId'),
      'DEFrame-UserId': localStorage.getItem('userId')
    };
  },

  async post(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    return response.json();
  }
};

// 1. 发送消息
async function sendMessage(message) {
  // 禁用发送按钮
  sendButton.disabled = true;

  // 添加用户消息到列表
  addMessage({ role: 'user', content: message });

  // 添加 AI 占位消息
  const aiMsg = addMessage({ role: 'assistant', content: '' });
  const thinkingEl = addThinkingBox(); // 添加思考过程展示区

  // 调用 API
  const result = await apiClient.post('/api/chat/send', { message });
  const sessionId = result.data.sessionId;

  // 建立 SSE 连接（EventSource 不支持自定义 Header，需通过 query 传递）
  const eventSource = new EventSource(
    `/api/chat/stream/${sessionId}?tenantId=${localStorage.getItem('tenantId')}`
  );

  eventSource.addEventListener('thinking', (e) => {
    const { step, thinkingContent, thinkingStatus } = JSON.parse(e.data);
    updateThinkingBox(thinkingEl, step, thinkingContent, thinkingStatus);
  });

  eventSource.addEventListener('skillCall', (e) => {
    const { skillName, status } = JSON.parse(e.data);
    updateThinkingBox(thinkingEl, '技能调用', `${skillName}: ${status}`, 'done');
  });

  eventSource.addEventListener('token', (e) => {
    aiMsg.content += JSON.parse(e.data).content;
    scrollToBottom();
  });

  eventSource.addEventListener('done', () => {
    eventSource.close();
    thinkingEl.remove(); // 完成后移除思考过程
    sendButton.disabled = false;
  });

  eventSource.addEventListener('error', (e) => {
    const { error } = JSON.parse(e.data);
    aiMsg.content = `错误: ${error}`;
    thinkingEl.remove();
    eventSource.close();
    sendButton.disabled = false;
  });
}
```

---

### 9.2 切换历史会话

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          切换会话流程                                    │
└─────────────────────────────────────────────────────────────────────────┘

1. 用户点击会话列表中的某个会话
   ↓
2. 前端关闭当前 SSE 连接
   ↓
3. 前端清空消息列表
   ↓
4. 前端调用 POST /api/chat/sessions/{sessionId}/restore
   Headers: DEFrame-TenantId, X-User-Id
   ↓
5. 后端从 PostgreSQL 加载会话到 Redis
   ↓
6. 前端显示历史消息
   ↓
7. 完成，用户可继续对话
```

**代码示例：**

成功判定为 `result.code === '200'`（与 [错误码](#错误码) 表一致，下同）。

```javascript
async function switchSession(sessionId) {
  // 1. 关闭当前 SSE
  if (currentEventSource) {
    currentEventSource.close();
    currentEventSource = null;
  }

  // 2. 清空消息列表
  messageList.innerHTML = '';
  currentSessionId = sessionId;

  // 3. 调用恢复接口（Headers 自动添加）
  const result = await fetch(
    `/api/chat/sessions/${sessionId}/restore`,
    {
      method: 'POST',
      headers: apiClient.getHeaders()
    }
  ).then(r => r.json());

  if (result.code === '200' && result.data.history) {
    // 4. 渲染历史消息
    result.data.history.forEach(msg => {
      addMessage({
        role: msg.role,
        content: msg.content
      });
    });
  }
}
```

---

### 9.3 加载会话列表

**触发时机（重要）**：仅在用户点击**「会话历史」**（或进入历史列表面板）时调用，用于拉取并展示会话摘要列表。  
**不要**在小助手首屏打开时调用（首屏首条为 **POST /send** 且不传 `sessionId`，见 **§9.0**；**不**在打开时调 `/sessions`）。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          加载会话列表流程                                 │
└─────────────────────────────────────────────────────────────────────────┘

1. 用户点击「会话历史」
   ↓
2. 前端调用 GET /api/chat/sessions
   Headers: DEFrame-UserId, DEFrame-TenantId
   ↓
3. 后端从 PostgreSQL 查询会话列表
   ↓
4. 前端渲染会话列表
   ↓
5. 完成
```

**代码示例：**

```javascript
/** 仅绑定到「会话历史」入口，勿在小助手 onOpen 时自动调用 */
async function loadSessionList() {
  const result = await fetch(
    '/api/chat/sessions',
    { headers: apiClient.getHeaders() }
  ).then(r => r.json());

  if (result.code === '200') {
    sessionList.innerHTML = result.data.map(session => `
      <div class="session-item" data-id="${session.id}">
        <span>${session.title}</span>
        <span>${formatTime(session.updatedAt)}</span>
      </div>
    `).join('');
  }
}
```

---

### 9.4 删除会话

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          删除会话流程                                      │
└─────────────────────────────────────────────────────────────────────────┘

1. 用户点击删除按钮
   ↓
2. 前端调用 DELETE /api/chat/sessions/{sessionId}
   Headers: DEFrame-TenantId
   ↓
3. 后端软删除会话
   ↓
4. 前端从列表移除该会话
   ↓
5. 如果删除的是当前会话，清空消息列表
   ↓
6. 完成
```

**代码示例：**

```javascript
async function deleteSession(sessionId) {
  if (!confirm('确定要删除该会话吗？')) return;

  await fetch(
    `/api/chat/sessions/${sessionId}`,
    {
      method: 'DELETE',
      headers: apiClient.getHeaders()
    }
  );

  // 从列表移除
  document.querySelector(`[data-id="${sessionId}"]`).remove();

  // 如果是当前会话，清空
  if (currentSessionId === sessionId) {
    messageList.innerHTML = '';
    currentSessionId = null;
  }
}
```

---

### 9.5 完整对话生命周期

与 **§9.0** 一致：小助手**首条**为 `POST /send`（**不传** `sessionId`），再 SSE；`GET /sessions` 仅在点**「会话历史」**时触发；**已有会话**的载入用 `POST /restore`（**§9.2**），不是首屏默认第一步。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         完整对话生命周期                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ 入口发首条    │         │  点会话历史   │         │  同一会话再发  │
│（无 sessionId)│         │              │         │  （有 sessionId)│
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                         │                         │
       ▼                         ▼                         ▼
POST /send                GET /sessions             POST /send
body.message 首条         渲染列表                 + sessionId
       │                         │                         │
       ▼                         ▼                         ▼
 返回 sessionId                 —                 SSE 收流…
       ↓
 SSE stream…

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  切换/恢复    │         │   删除会话    │         │  提交反馈    │
│（列表点选）   │         │              │         │              │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                         │                         │
       ▼                         ▼                         ▼
POST /restore             DELETE /sessions/…       POST /feedback
       │                         │                         │
       ▼                         ▼                         ▼
  显示历史消息              软删除会话                 记录反馈
```

说明：首条与 §9.0、§9.1 一致；同一会话后续轮次在 `POST /send` 中**携带** `data.sessionId`；新对话按钮则再次省略 `sessionId`。**切换 SSE 前**先 close 旧连接。

---

### 9.6 状态管理建议

```javascript
// 使用 Pinia 或 Vuex 管理状态
const chatStore = {
  state: {
    sessions: [],           // 会话列表
    currentSessionId: null, // 当前会话 ID
    messages: [],           // 当前会话消息
    streaming: false,        // 流式响应状态
    loading: false          // 加载状态
  },

  actions: {
    // 发送消息
    async sendMessage(message, tenantId, userId) {
      this.streaming = true;
      const result = await api.sendMessage({
        sessionId: this.currentSessionId,
        message,
        tenantId,
        userId
      });

      this.currentSessionId = result.data.sessionId;
      this.messages.push({ role: 'user', content: message });
      this.messages.push({ role: 'assistant', content: '' });

      // 建立 SSE
      this.connectSSE(this.currentSessionId, tenantId);
    },

    // SSE 连接
    connectSSE(sessionId, tenantId) {
      const es = api.createSseStream(sessionId, tenantId, (type, data) => {
        switch (type) {
          case 'token':
            this.messages.at(-1).content += data.content;
            break;
          case 'done':
            this.streaming = false;
            break;
          case 'error':
            this.messages.at(-1).content = `错误: ${data.error}`;
            this.streaming = false;
            break;
        }
      });
    }
  }
};
```

---

### 9.7 错误处理

与上文 **[错误码](#错误码)** 表一致：成功码仅 `200`；业务异常仅表内三枚（`SESSION_NOT_FOUND` / `PARAM_MISSING` / `chat_validation_error`）。

```javascript
/** 与《错误码》表「错误码」列一致 */
const CHAT_API_SUCCESS = '200';

const CHAT_API_ERROR_USER_MESSAGE = {
  SESSION_NOT_FOUND: '会话不存在或无权访问',
  PARAM_MISSING: '缺少必要参数',
  chat_validation_error: '输入包含非法内容',
};

function resolveChatApiErrorMessage(code, serverMessage) {
  if (code === CHAT_API_SUCCESS) {
    return null;
  }
  const mapped = CHAT_API_ERROR_USER_MESSAGE[code];
  if (mapped) {
    return mapped;
  }
  // 表外业务码或后端扩展码：以后端 message 为主
  return serverMessage || '服务异常，请稍后重试';
}

async function apiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const code = data?.code;

    if (String(code) !== CHAT_API_SUCCESS) {
      const userMessage = resolveChatApiErrorMessage(code, data.message);
      alert(userMessage);
      return null;
    }

    return data;
  } catch (error) {
    console.error('请求失败:', error);
    alert('网络错误，请重试');
    return null;
  }
}
```

---

## 10. 注意事项

### 10.0 入口与接口顺序

- 从**小助手入口**发起**首条对话**时：先 **POST /api/chat/send**，**不传 `sessionId`**，`message` 为用户发送的文案，用返回的 `sessionId` 再连 SSE；**不要**在首屏为「拉列表」而请求 `GET /sessions`。
- **GET /api/chat/sessions** 只服务**会话历史列表** UI，在用户点击**「会话历史」**时请求。
- **POST …/restore**：用于在**历史里选中已有会话**等场景恢复消息区，**不是**首屏默认首请求（与 **§6、§9.2** 一致）。

### 10.1 SSE 连接管理

- 每次发送消息前，**先关闭**旧的 SSE 连接
- 切换会话时，**必须**关闭当前 SSE
- SSE 连接断开后，前端应显示"连接已断开"

### 10.2 sessionId 处理

- 新建会话/从小助手**首条**发信时，不传或省略 `sessionId`（与 **§9.0** 一致）
- 同一多轮对话内再次 **POST /send** 时，应携带上一步返回的 `sessionId`
- 从历史列表切会话时，使用目标会话的 `sessionId`（可先 **restore** 再续聊，依产品）
- `sessionId` 必须符合 `[a-zA-Z0-9\\-]` 格式

### 10.3 并发控制

- 流式响应期间，**禁用**发送按钮
- `streaming === true` 时，忽略新的发送请求

### 10.4 错误恢复

- SSE 错误时，提示用户并提供重试按钮
- 网络断开时，自动重连（可选）

