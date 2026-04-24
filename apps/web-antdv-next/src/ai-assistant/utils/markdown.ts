import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

/**
 * 将 Markdown 文本解析为 HTML。
 *
 * 注意：解析后的内容会通过 v-html 渲染，XSS 风险由 markdown-it 的
 * html: false 配置控制。严禁将未校验的用户输入直接传入此方法。
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';
  return md.render(text);
}
