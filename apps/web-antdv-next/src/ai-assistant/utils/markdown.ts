import type { Token } from 'markdown-it';

import MarkdownIt from 'markdown-it';
import multimdTable from 'markdown-it-multimd-table';

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(multimdTable);

// 1. 表格外层：加 table-fixed 固定布局
md.renderer.rules.table_open = () =>
  '<table class="w-full border-collapse my-4 table-fixed">';

// 2. 表头：给第一列加固定宽度和居中样式
md.renderer.rules.th_open = (tokens, idx) => {
  // 判断是否为第一列
  const isFirstCol = (tokens[idx] as Token | undefined)?.index === 0;
  if (isFirstCol) {
    // 给第一列加最小宽度 + 居中对齐
    return '<th class="border border-border px-4 py-3 bg-gray-100 font-semibold min-w-[80px] text-center align-middle text-[rgba(0,0,0,0.88)] dark:bg-muted dark:text-foreground">';
  }
  return '<th class="border border-border px-4 py-3 bg-gray-100 font-semibold text-[rgba(0,0,0,0.88)] dark:bg-muted dark:text-foreground">';
};

// 3. 单元格：给第一列同步宽度和居中
md.renderer.rules.td_open = (tokens, idx) => {
  const isFirstCol = (tokens[idx] as Token | undefined)?.index === 0;
  if (isFirstCol) {
    return '<td class="border px-4 py-3 min-w-[80px] text-center align-middle">';
  }
  return '<td class="border px-4 py-3">';
};
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
