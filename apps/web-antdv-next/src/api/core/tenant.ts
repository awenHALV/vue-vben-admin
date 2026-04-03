import { requestClient } from '#/api/request';

export interface BackendTenantItem {
  /** 列表/详情中与 id 可能同时存在的租户业务 id */
  tenantId?: number | string;
  /** 后端可能返回的菜单 id 列表（逗号分隔） */
  adminAccount?: string;
  adminName?: string;
  adminPhone?: string;
  admin_name?: string;
  admin_phone?: string;
  companyName?: string;
  contact?: string;
  createdAt?: string;
  creditCode?: string;
  featureIds?: string | string[];
  id: number | string;
  phone?: string;
  remark?: string;
  status?: boolean | number | string;
  tenantCode: string;
  tenantName: string;
  tenantNameEn?: string;
  updatedAt?: string;
}

export interface TenantPageParams {
  current?: number;
  size?: number;
  status?: number | string;
  tenantCode?: string;
  tenantName?: string;
}

export interface TenantPageResult {
  items: BackendTenantItem[];
  total: number;
}

interface BackendPagedResult<T> {
  current?: number;
  pages?: number;
  records?: T[];
  size?: number;
  total?: number;
}

/**
 * 获取租户列表（分页）
 *
 * 注意：这里的接口路径请按你的后端实际实现调整。
 * 当前实现兼容以下返回结构：
 * - []
 * - { items, total }
 * - { records, total, current, size }
 */
export async function getTenantPageApi(
  params: TenantPageParams = {},
): Promise<TenantPageResult> {
  const res = await requestClient.get<
    | BackendPagedResult<BackendTenantItem>
    | BackendTenantItem[]
    | TenantPageResult
  >('/de-base-system/external/private/tenant/page', { params } as any);

  if (Array.isArray(res)) {
    return { items: res, total: res.length };
  }

  if (res && typeof res === 'object') {
    const paged = res as BackendPagedResult<BackendTenantItem>;
    if (Array.isArray(paged.records)) {
      return {
        items: paged.records,
        total: paged.total ?? paged.records.length,
      };
    }
    const legacy = res as TenantPageResult;
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
 * 租户详情
 * GET /de-base-system/external/private/tenant/detail?id=
 */
export async function getTenantDetailApi(
  id: number | string,
): Promise<BackendTenantItem> {
  return requestClient.get<BackendTenantItem>(
    '/de-base-system/external/private/tenant/detail',
    { params: { id } },
  );
}

/**
 * 新增租户请求体（与接口文档一致）
 * POST /de-base-system/external/private/tenant/create
 */
export interface TenantCreateBody {
  /** 菜单 id，英文逗号分隔 */
  featureIds: string;
  adminName: string;
  adminPhone: string;
  companyName: string;
  creditCode: string;
  status: boolean | number | string;
  tenantName: string;
}

export async function createTenantApi(body: TenantCreateBody): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/tenant/create',
    body,
  );
}

/** 更新租户（在新增字段基础上增加主键与租户编码） */
export interface UpdateTenantParams extends TenantCreateBody {
  id: number | string;
  adminName: string;
  adminPhone: string;
  companyName: string;
  creditCode: string;
  tenantCode: string;
  status: boolean | number | string;
  tenantName: string;
}

export async function updateTenantApi(
  params: UpdateTenantParams,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/tenant/update',
    params,
  );
}

export async function batchDeleteTenantApi(
  ids: Array<number | string>,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/tenant/batch-delete',
    {
      ids,
    },
  );
}

export interface UpdateConfigParams {
  tenantId: number | string;
  featureIds: string;
}

/**
 * 编辑功能配置
 * POST /external/private/tenant/feature/update
 */
export async function updateConfigApi(
  params: UpdateConfigParams,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/tenant/feature/update',
    params,
  );
}

/** GET /de-base-system/external/private/tenant/{id}/auth-code */
export async function getTenantAuthCodeApi(
  tenantId: number | string,
): Promise<{ code: string }> {
  return requestClient.post<{ code: string }>(
    `/de-base-system/external/private/tenant/${tenantId}/auth-code`,
  );
}

/** POST /de-base-system/external/public/tenant/switch，返回新 token */
export async function switchTenantApi(
  code: string,
): Promise<{ token: string }> {
  return requestClient.post<{ token: string }>(
    '/de-base-system/external/public/tenant/switch',
    { code },
    { skipReAuthenticate: true },
  );
}
