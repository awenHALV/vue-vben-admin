import { requestClient } from '#/api/request';

/** 字典分页列表单行（与接口 records 项一致） */
export interface DictListItem {
  /** 主键 */
  id: number | string;
  /** 字典名称 */
  dictName: string;
  /** 字典编码 */
  dictCode: string;
  /** 备注 */
  remark?: string;
}

/** 分页查询参数（GET query，均为可选） */
export interface DictPageParams {
  current?: number;
  /** 字典编码 */
  dictCode?: string;
  /** 字典名称 */
  dictName?: string;
  orderBy?: string;
  size?: number;
}

/** 供表格使用的统一分页结果（与租户等页面对齐） */
export interface DictPageResult {
  items: DictListItem[];
  total: number;
}

/**
 * 后端分页 data 结构（拦截器已解包外层 code/message/data）
 */
interface DictPageData {
  current?: number;
  pages?: number;
  records?: DictListItem[];
  size?: number;
  total?: number;
}

/**
 * 分页查询字典
 * GET /de-base-system/external/private/dict/page
 */
export async function getDictPageApi(
  params: DictPageParams = {},
): Promise<DictPageResult> {
  const res = await requestClient.get<
    DictListItem[] | DictPageData | DictPageResult
  >('/de-base-system/external/private/dict/page', { params } as any);

  if (Array.isArray(res)) {
    return { items: res, total: res.length };
  }

  if (res && typeof res === 'object') {
    const paged = res as DictPageData;
    if (Array.isArray(paged.records)) {
      return {
        items: paged.records,
        total: paged.total ?? paged.records.length,
      };
    }
    const legacy = res as DictPageResult;
    if (Array.isArray(legacy.items)) {
      return {
        items: legacy.items,
        total: legacy.total ?? legacy.items.length,
      };
    }
  }

  return { items: [], total: 0 };
}

/** 新增/更新字典请求体 */
export interface DictCreateBody {
  dictCode: string;
  dictName: string;
  /** 备注，可选 */
  remark?: string;
}

/**
 * 新增字典
 * POST /de-base-system/external/private/dict
 */
export async function createDictApi(body: DictCreateBody): Promise<void> {
  await requestClient.post('/de-base-system/external/private/dict', body);
}

/**
 * 更新字典
 * PUT /de-base-system/external/private/dict/{id}
 */
export async function updateDictApi(
  id: number | string,
  body: DictCreateBody,
): Promise<void> {
  await requestClient.put(
    `/de-base-system/external/private/dict/${encodeURIComponent(String(id))}`,
    body,
  );
}

/**
 * 删除字典
 * POST /external/private/dict/batch/delete
 */
export async function deleteDictApi(
  ids: Array<number | string>,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/dict/batch/delete',
    ids,
  );
}
