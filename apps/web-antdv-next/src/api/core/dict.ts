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

// ─── 字典项（某字典下的 option）────────────────────────────────────────

/** 字典项列表行 */
export interface DictOptionItem {
  id: number | string;
  dictCode?: string;
  optionKey: string;
  optionValue: string;
  optionValueEn?: string;
  remark?: string;
  sort?: number;
}

/** 字典项分页查询参数 */
export interface DictOptionPageParams {
  current?: number;
  size?: number;
  /** 筛选：字典项键*/
  optionKey?: string;
  /** 筛选：字典项值 */
  optionValue?: string;
}

/** 字典项分页结果 */
export interface DictOptionPageResult {
  items: DictOptionItem[];
  total: number;
}

interface DictOptionPageData {
  current?: number;
  pages?: number;
  records?: DictOptionItem[];
  size?: number;
  total?: number;
}

function dictOptionBasePath(dictId: number | string) {
  return `/de-base-system/external/private/dict/${encodeURIComponent(String(dictId))}/option`;
}

function mapDictOptionRow(raw: Record<string, unknown>): DictOptionItem {
  return {
    id: raw.id as number | string,
    dictCode: (raw.dictCode ?? raw.dict_code) as string | undefined,
    optionKey: String(raw.optionKey ?? raw.option_key ?? ''),
    optionValue: String(raw.optionValue ?? raw.option_value ?? ''),
    optionValueEn: (raw.optionValueEn ?? raw.option_value_en) as
      | string
      | undefined,
    remark: (raw.remark as string | undefined) ?? undefined,
    sort: raw.sort !== undefined && raw.sort !== null ? Number(raw.sort) : 0,
  };
}

/**
 * 字典项分页
 * GET /de-base-system/external/private/dict/{id}/option/page
 */
export async function getDictOptionPageApi(
  dictId: number | string,
  params: DictOptionPageParams = {},
): Promise<DictOptionPageResult> {
  const res = await requestClient.get<
    DictOptionItem[] | DictOptionPageData | DictOptionPageResult
  >(`${dictOptionBasePath(dictId)}/page`, { params } as any);

  if (Array.isArray(res)) {
    return {
      items: res.map((r) => mapDictOptionRow(r as Record<string, unknown>)),
      total: res.length,
    };
  }

  if (res && typeof res === 'object') {
    const paged = res as DictOptionPageData;
    if (Array.isArray(paged.records)) {
      return {
        items: paged.records.map((r) =>
          mapDictOptionRow(r as Record<string, unknown>),
        ),
        total: paged.total ?? paged.records.length,
      };
    }
    const legacy = res as DictOptionPageResult;
    if (Array.isArray(legacy.items)) {
      return {
        items: legacy.items.map((r) =>
          mapDictOptionRow(r as Record<string, unknown>),
        ),
        total: legacy.total ?? legacy.items.length,
      };
    }
  }

  return { items: [], total: 0 };
}

/** 新增/更新字典项请求体 */
export interface DictOptionBody {
  /** 字典编码（可选，与截图一致可单独覆盖） */
  dictCode?: string;
  sort: number;
  optionKey: string;
  optionValue: string;
  optionValueEn: string;
  remark?: string;
}

/**
 * 新增字典项
 * POST /de-base-system/external/private/dict/{id}/option
 */
export async function createDictOptionApi(
  dictId: number | string,
  body: DictOptionBody,
): Promise<void> {
  await requestClient.post(dictOptionBasePath(dictId), body);
}

/**
 * 更新字典项
 * PUT /de-base-system/external/private/dict/{id}/option/{optionId}
 */
export async function updateDictOptionApi(
  dictId: number | string,
  optionId: number | string,
  body: DictOptionBody,
): Promise<void> {
  await requestClient.put(
    `${dictOptionBasePath(dictId)}/${encodeURIComponent(String(optionId))}`,
    body,
  );
}

/**
 * 批量删除字典项
 * POST /de-base-system/external/private/dict/{id}/option/batch/delete
 */
export async function batchDeleteDictOptionApi(
  dictId: number | string,
  ids: Array<number | string>,
): Promise<void> {
  await requestClient.post(`${dictOptionBasePath(dictId)}/batch/delete`, ids);
}
