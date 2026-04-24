/**
 * 与 SQLBot 类似的对话流：后端多为 POST + `text/event-stream`，正文为 SSE `data:` 行。
 * 参考 SQLBot：`frontend/src/api/chat.ts` 的 `fetchStream` + Python `StreamingResponse(..., media_type="text/event-stream")`。
 *
 * 真实联调时请用 `@vben/request` 的 `postSSE` / `fetch` + `getReader` 解析；此处仅提供**前端本地**模拟流，便于调试打字机效果与解析逻辑。
 */

/** 将一段 SSE 文本块按行拆出 `data:` 载荷（简化版，不处理多行 data） */
export function extractSseDataLines(chunk: string): string[] {
  const lines: string[] = [];
  for (const line of chunk.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      lines.push(line.slice(5).trim());
    }
  }
  return lines;
}

/** 模拟 SQLBot 风格：分片推送 assistant 文本（yield 原始 SSE 片段字符串） */
export async function* generateMockAssistantTextStream(
  fullText: string,
  options?: { chunkChars?: number; delayMs?: number },
): AsyncGenerator<string> {
  const chunkChars = options?.chunkChars ?? 4;
  const delayMs = options?.delayMs ?? 30;
  for (let i = 0; i < fullText.length; i += chunkChars) {
    const piece = fullText.slice(i, i + chunkChars);
    const payload = JSON.stringify({ content: piece, done: false });
    yield `data: ${payload}\n\n`;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  yield `data: ${JSON.stringify({ content: '', done: true })}\n\n`;
}

/** 将异步迭代器拼成完整 assistant 文本（用于验证 mock 解析） */
export async function collectMockStreamText(
  stream: AsyncGenerator<string>,
): Promise<string> {
  let acc = '';
  for await (const chunk of stream) {
    for (const line of extractSseDataLines(chunk)) {
      if (!line) continue;
      try {
        const j = JSON.parse(line) as { content?: string };
        if (j.content) acc += j.content;
      } catch {
        /* ignore */
      }
    }
  }
  return acc;
}
