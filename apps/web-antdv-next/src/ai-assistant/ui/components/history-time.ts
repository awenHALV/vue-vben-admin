/**
 * 历史对话列表时间展示（与后端 `yyyy-mm-dd HH:mm:ss` 格式对齐）。
 */
export function parseBackendDateTime(value: string): Date | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  const date = new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss ?? 0),
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function formatHm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function isSameYmd(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(target: Date, now: Date): boolean {
  const y = new Date(now);
  y.setHours(0, 0, 0, 0);
  y.setDate(y.getDate() - 1);
  return isSameYmd(target, y);
}

export function formatHistoryTime(value: string): string {
  const dt = parseBackendDateTime(value);
  if (!dt) return value;

  const now = new Date();
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setHours(0, 0, 0, 0);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  if (dt.getTime() >= twoDaysAgo.getTime()) {
    if (isSameYmd(dt, now)) return `今天 ${formatHm(dt)}`;
    if (isYesterday(dt, now)) return `昨天 ${formatHm(dt)}`;
  }

  return `${formatYmd(dt)} ${formatHm(dt)}`;
}
