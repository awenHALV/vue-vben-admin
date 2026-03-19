/**
 * 角色管理 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 角色信息 */
export interface RoleInfo {
  id: string;
  roleName: string;
  roleAlias?: string;
  deptId?: string;
  deptName?: string;
  tenantId?: string;
}

/** 角色分页查询参数 */
export interface RolePageParams {
  current: number;
  size: number;
  roleName?: string;
  deptId?: string;
}

/** 分页响应 */
export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/** 创建角色参数 */
export interface CreateRoleParams {
  roleName: string;
  deptId: string;
}

/** 更新角色参数 */
export interface UpdateRoleParams {
  id: string;
  roleName: string;
  deptId: string;
}

/** 角色权限信息 */
export interface RolePermissionInfo {
  roleId: string;
  appIds?: string;
  featureIds?: string;
}

/** 应用信息 */
export interface AppInfo {
  id: string;
  appName: string;
  appNameEn?: string;
  children?: FeatureInfo[];
}

/** 功能权限信息 */
export interface FeatureInfo {
  id: string;
  featureName: string;
  featureNameEn?: string;
  children?: FeatureInfo[];
}

// ==================== API 函数 ====================

/**
 * 获取角色分页列表
 */
export async function getRolePageApi(params: RolePageParams) {
  return requestClient.get<PageResult<RoleInfo>>('/de-base-system/external/private/role/page', { params });
}

/**
 * 创建角色
 */
export async function createRoleApi(data: CreateRoleParams) {
  return requestClient.post('/de-base-system/external/private/role/create', data);
}

/**
 * 更新角色
 */
export async function updateRoleApi(data: UpdateRoleParams) {
  return requestClient.post('/de-base-system/external/private/role/update', data);
}

/**
 * 删除角色
 */
export async function deleteRoleApi(id: string) {
  return requestClient.post(`/de-base-system/external/private/role/delete?ids=${id}`);
}

/**
 * 获取角色权限
 */
export async function getRolePermissionApi(roleId: string) {
  return requestClient.get<RolePermissionInfo>('/de-base-system/external/private/role/feature', { params: { roleId } });
}

/**
 * 保存角色权限
 */
export async function saveRolePermissionApi(data: { roleId: string; appIds: string; featureIds: string }) {
  return requestClient.post('/de-base-system/external/private/role/feature/update', data);
}

/**
 * 获取应用列表
 */
export async function getAppListApi() {
  return requestClient.get<{ records: AppInfo[] }>('/de-base-system/external/private/app/page', {
    params: { current: 1, size: 1000 },
  });
}

/**
 * 获取应用功能树
 */
export async function getAppFeatureTreeApi(appId: string) {
  return requestClient.get<FeatureInfo[]>('/de-base-system/external/private/app-feature/tree', { params: { appId } });
}