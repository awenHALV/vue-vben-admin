import type { TradingCalendarTask, TradingTaskStatus } from './types';

import dayjs from 'dayjs';

export function getTradingStatus(task: TradingCalendarTask): TradingTaskStatus {
  const now = dayjs();

  const startDateTime = dayjs(`${task.tradeDate} ${task.targetStartTime}`);
  const endDateTime = dayjs(`${task.tradeDate} ${task.targetEndTime}`);

  if (now.isBefore(startDateTime)) {
    return 'notStarted';
  }

  if (now.isAfter(endDateTime)) {
    return 'ended';
  }

  return 'inProgress';
}
