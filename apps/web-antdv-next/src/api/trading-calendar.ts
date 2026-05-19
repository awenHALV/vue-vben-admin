/**
 * 交易日历 API
 * @author inspur-iep-ai
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 交易日历任务项 */
export interface TradingCalendarTaskItem {
  /** 主键ID */
  id: number | string;
  /** 交易日期 */
  tradeDate: string;
  /** 交易时间，格式：开始时间-结束时间 */
  tradeTime?: string;
  /** 交易类型，字典：trans_lts_type */
  tradeType: string;
  /** 交易周期，字典：trans_lts_classify */
  tradeCycle: string;
  /** 标的开始时间 */
  targetStartTime: string;
  /** 标的结束时间 */
  targetEndTime: string;
  /** 省份编码 */
  province: string;
}

/** 交易日历列表查询参数 */
export interface TradingCalendarListParams {
  /** 省份编码（必填） */
  province: string;
  /** 交易月份（可选） */
  month?: string;
  /** 页码 */
  size: -1;
}

/** 交易日历列表结果 */
export interface TradingCalendarListResult {
  /** 总记录数 */
  total: number | string;
  /** 数据列表 */
  records?: TradingCalendarTaskItem[];
  list?: TradingCalendarTaskItem[];
}

/** 新增交易任务参数 */
export interface TradingCalendarCreateCmd {
  /** 交易日期 */
  tradeDate: string;
  /** 交易时间，格式：开始时间-结束时间 */
  tradeTime: string;
  /** 交易类型，字典：trans_lts_type */
  tradeType: string;
  /** 交易周期，字典：trans_lts_classify */
  tradeCycle: string;
  /** 标的开始时间 */
  targetStartTime: string;
  /** 标的结束时间 */
  targetEndTime: string;
  /** 省份编码 */
  province: string;
}

/** 编辑交易任务参数 */
export interface TradingCalendarUpdateCmd {
  /** 交易任务ID */
  tradeCalendarTaskId: string;
  /** 交易日期 */
  tradeDate: string;
  /** 交易时间，格式：开始时间-结束时间 */
  tradeTime: string;
  /** 交易类型，字典：trans_lts_type */
  tradeType: string;
  /** 交易周期，字典：trans_lts_classify */
  tradeCycle: string;
  /** 标的开始时间 */
  targetStartTime: string;
  /** 标的结束时间 */
  targetEndTime: string;
  /** 省份编码 */
  province: string;
}

/** 删除交易任务参数 */
export interface TradingCalendarDeleteCmd {
  /** 交易任务ID数组 */
  ids: string[];
}

/** 电网区域项 */
export interface GridAreaItem {
  /** 区域ID */
  id: string;
  /** 区域名称 */
  gridAreaName: string;
  /** 区域编码 */
  gridAreaCode: string;
  /** 区域简称 */
  gridAreaAbbr?: string;
  /** 区域层级 */
  gridAreaLevel?: string;
}

// ==================== API 路径 ====================

enum Api {
  /** 新增交易任务 */
  Add = '/iep-trade-transaction-service/external/private/trade-calendar/add',
  /** 删除交易任务 */
  Delete = '/iep-trade-transaction-service/external/private/trade-calendar/delete',
  /** 查询交易日历详情 */
  Detail = '/iep-trade-transaction-service/external/private/trade-calendar/detail',
  /** 编辑交易任务 */
  Edit = '/iep-trade-transaction-service/external/private/trade-calendar/edit',
  /** 电网区域列表 */
  GridAreaList = '/iep-base-config-service/external/private/grid-area/list',
  /** 查询交易日历列表 */
  List = '/iep-trade-transaction-service/external/private/trade-calendar/list',
  /** OCR识别交易公告 */
  OCR = '/iep-trade-transaction-service/external/private/trade-calendar/ocr',
}

// ==================== API 函数 ====================

/**
 * 查询交易日历列表
 * @param params 查询参数
 * @author inspur-iep-ai
 */
export async function getTradingCalendarListApi(
  params: TradingCalendarListParams,
): Promise<TradingCalendarListResult> {
  return requestClient.get<TradingCalendarListResult>(Api.List, { params });
}

/**
 * 查询交易日历详情
 * @param id 交易任务ID
 * @author inspur-iep-ai
 */
export async function getTradingCalendarDetailApi(
  id: number,
): Promise<TradingCalendarTaskItem> {
  return requestClient.get<TradingCalendarTaskItem>(Api.Detail, {
    params: { id },
  });
}

/**
 * 新增交易任务
 * @param data 交易任务数据
 * @author inspur-iep-ai
 */
export async function createTradingCalendarApi(data: TradingCalendarCreateCmd) {
  return requestClient.post(Api.Add, data);
}

/**
 * 编辑交易任务
 * @param data 交易任务数据
 * @author inspur-iep-ai
 */
export async function updateTradingCalendarApi(data: TradingCalendarUpdateCmd) {
  return requestClient.post(Api.Edit, data);
}

/**
 * 删除交易任务
 * @param ids 交易任务ID数组
 * @author inspur-iep-ai
 */
export async function deleteTradingCalendarApi(ids: string[]) {
  return requestClient.post(Api.Delete, ids);
}

/**
 * OCR识别交易公告
 * @param data 图片数据
 * @author inspur-iep-ai
 */
export async function ocrTradingCalendarApi(data: FormData) {
  return requestClient.post(Api.OCR, data);
}

/**
 * 获取电网区域列表
 * @author inspur-iep-ai
 */
export async function getGridAreaListApi(): Promise<GridAreaItem[]> {
  return requestClient.get<GridAreaItem[]>(Api.GridAreaList);
}
