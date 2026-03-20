import { requestClient } from '#/api/request';

export interface BackendTenantItem {
  contact?: string;
  createdAt?: string;
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
    BackendTenantItem[] | BackendPagedResult<BackendTenantItem> | TenantPageResult
  >('/de-base-system/external/private/tenant/page', { params } as any);

  if (Array.isArray(res)) {
    return { items: res, total: res.length };
  }

  if (res && typeof res === 'object') {
    const paged = res as BackendPagedResult<BackendTenantItem>;
    if (Array.isArray(paged.records)) {
      return { items: paged.records, total: paged.total ?? paged.records.length };
    }
    const legacy = res as TenantPageResult;
    if (Array.isArray(legacy.items)) {
      return { items: legacy.items, total: legacy.total ?? legacy.items.length };
    }
  }

  return { items: [], total: 0 };
}

export interface CreateTenantParams {
  contact?: string;
  phone?: string;
  remark?: string;
  status?: boolean | number | string;
  tenantCode: string;
  tenantName: string;
  tenantNameEn?: string;
}

export async function createTenantApi(params: CreateTenantParams): Promise<void> {
  await requestClient.post('/de-base-system/external/private/tenant/create', params);
}

export interface UpdateTenantParams extends CreateTenantParams {
  id: number | string;
}

export async function updateTenantApi(params: UpdateTenantParams): Promise<void> {
  await requestClient.post('/de-base-system/external/private/tenant/update', params);
}

export async function deleteTenantApi(id: number | string): Promise<void> {
  await requestClient.post('/de-base-system/external/private/tenant/delete', { id });
}

export async function batchDeleteTenantApi(ids: Array<number | string>): Promise<void> {
  await requestClient.post('/de-base-system/external/private/tenant/batch-delete', {
    ids,
  });
}

