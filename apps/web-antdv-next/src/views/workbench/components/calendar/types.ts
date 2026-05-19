/**
 * 交易日历类型定义
 * @author inspur-iep-ai
 */

import type { Dayjs } from 'dayjs';

import { $t } from '#/locales';

/** 交易类型（字典值，动态获取） */
export type TradingTaskType = string;

/** 交易状态 */
export type TradingTaskStatus = 'ended' | 'inProgress' | 'notStarted';

/** 交易周期（字典值，动态获取） */
export type TradingCycle = string;

/** 交易主体/省份 */
export interface TradingProvince {
  id: string;
  name: string;
  code: string;
}

/** 交易日历任务 */
export interface TradingCalendarTask {
  id: string;
  /** 省份编码 */
  provinceId: string;
  /** 省份名称 */
  provinceName: string;
  /** 交易日期 */
  tradeDate: string;
  /** 交易类型（字典：trans_lts_type） */
  tradeType: TradingTaskType;
  /** 交易周期（字典：trans_lts_classify） */
  tradingCycle: TradingCycle;
  /** 交易标的开始日期 */
  targetStartDate: string;
  /** 交易标的结束日期 */
  targetEndDate: string;
  /** 交易标的开始时段 */
  targetStartTime: string;
  /** 交易标的结束时段 */
  targetEndTime: string;
  /** 创建人 */
  creatorName: string;
  /** 创建时间 */
  createTime: string;
}

/** 交易任务表单数据 */
export interface TradingCalendarTaskForm {
  id?: string;
  provinceId: string;
  tradeDate: string;
  tradeType: null | TradingTaskType;
  tradingCycle: null | TradingCycle;
  targetStartDate: string;
  targetEndDate: string;
  targetStartTime: string;
  targetEndTime: string;
}

/** 日历单元格数据 */
export interface CalendarDayCell {
  date: Dayjs;
  hiddenCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  key: string;
  tasks: TradingCalendarTask[];
  visibleTasks: TradingCalendarTask[];
}

/** 状态颜色配置 */
export interface StatusColorConfig {
  background: string;
  accent: string;
}

/** 获取交易类型标签映射（兼容旧代码，实际使用字典 API） */
export function getTradeTypeLabels(): Record<string, string> {
  return {
    centralized: $t('tradingCalendar.tradeTypes.centralized'),
    rolling: $t('tradingCalendar.tradeTypes.rolling'),
    listing: $t('tradingCalendar.tradeTypes.listing'),
  };
}

/** 获取交易周期标签映射（兼容旧代码，实际使用字典 API） */
export function getTradingCycleLabels(): Record<string, string> {
  return {
    year: $t('tradingCalendar.tradingCycles.year'),
    month: $t('tradingCalendar.tradingCycles.month'),
    monthInner: $t('tradingCalendar.tradingCycles.monthInner'),
  };
}

/** 获取交易状态标签映射 */
export function getTradingStatusLabels(): Record<TradingTaskStatus, string> {
  return {
    notStarted: $t('tradingCalendar.status.notStarted'),
    inProgress: $t('tradingCalendar.status.inProgress'),
    ended: $t('tradingCalendar.status.ended'),
  };
}

/** 交易状态颜色配置 - 新需求：绿色(未开始)、蓝色(交易中)、灰色(已结束) */
export const TRADING_TASK_STATUS_COLORS: Record<
  TradingTaskStatus,
  StatusColorConfig
> = {
  notStarted: {
    background: 'rgba(34, 197, 94, 0.12)',
    accent: '#16a34a',
  },
  inProgress: {
    background: 'rgba(59, 130, 246, 0.12)',
    accent: '#2563eb',
  },
  ended: {
    background: 'rgba(156, 163, 175, 0.12)',
    accent: '#6b7280',
  },
};
