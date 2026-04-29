/**
 * 咨询信息 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 咨询信息 */
export interface ConsultationInfo {
  /** ID */
  id: number;
  /** 联系人姓名 */
  contactName: string;
  /** 联系人电话 */
  contactPhone: string;
  /** 公司名称 */
  companyName: string;
  /** 需求描述 */
  requirementDescription: string;
  /** 来源类型 */
  sourceType?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/** 咨询信息分页查询参数 */
export interface ConsultationPageParams {
  /** 当前页 */
  current: number;
  /** 页大小 */
  size: number;
  /** 联系人姓名 */
  contactName?: string;
  /** 联系人电话 */
  contactPhone?: string;
  /** 公司名称 */
  companyName?: string;
}

/** 供表格使用的统一分页结果（与 dict 等页面对齐） */
export interface ConsultationPageResult {
  items: ConsultationInfo[];
  total: number;
}

/**
 * 后端分页 data 结构（拦截器已解包外层 code/message/data）
 */
interface ConsultationPageData {
  current?: number;
  pages?: number;
  records?: ConsultationInfo[];
  size?: number;
  total?: number;
}

// ==================== API 函数 ====================

/**
 * 获取咨询信息分页列表
 * GET /official-website/external/private/request-form-data/page
 */
export async function getConsultationPageApi(
  params: ConsultationPageParams,
): Promise<ConsultationPageResult> {
  const res = await requestClient.get<
    ConsultationInfo[] | ConsultationPageData | ConsultationPageResult
  >('/official-website-service/external/private/request-form-data/page', {
    params,
  } as any);

  // 如果是数组，直接返回
  if (Array.isArray(res)) {
    return { items: res, total: res.length };
  }

  // 如果是对象，处理分页数据
  if (res && typeof res === 'object') {
    const paged = res as ConsultationPageData;
    if (Array.isArray(paged.records)) {
      return {
        items: paged.records,
        total: paged.total ?? paged.records.length,
      };
    }
    // 兼容已转换的格式
    const legacy = res as ConsultationPageResult;
    if (Array.isArray(legacy.items)) {
      return {
        items: legacy.items,
        total: legacy.total ?? legacy.items.length,
      };
    }
  }

  return { items: [], total: 0 };
}

/**
 * 获取咨询信息详情
 */
export async function getConsultationDetailApi(id: number) {
  const res = await requestClient.get<{
    code: string;
    message: string;
    data: ConsultationInfo;
  }>(`/official-website-service/system/consultation/${id}`);
  return res.data;
}
