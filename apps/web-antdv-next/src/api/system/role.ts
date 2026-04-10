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

/** 角色权限信息（字段名以网关/拦截器解包后的 camelCase 为准；前端另兼容 snake_case） */
export interface RolePermissionInfo {
  roleId: string;
  appIds?: string;
  /** 逗号分隔的功能 id，或与 featuresId / feature_id 等价 */
  featureIds?: string;
  featuresId?: string;
  feature_id?: string;
  features_ids?: string | string[];
}

/** 角色数据权限行（与 getDataSourceApi 返回的 data 子项一致） */
export interface DataSourceInfo {
  resourceId?: number | string;
  resourceName?: string;
  resourceCode: string;
  dataScope: string;
}

/** 保存角色数据权限请求体 */
export interface SaveDataSourceParams {
  roleId: string;
  resources: Array<{
    dataScope: string;
    resourceCode: string;
    resourceId?: number | string;
  }>;
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
  featureType?: 'BUTTON' | 'MENU'; // 功能类型：MENU-菜单，BUTTON-按钮
  parentId?: string;
  children?: FeatureInfo[];
}

// ==================== API 函数 ====================

/**
 * 获取角色分页列表
 */
export async function getRolePageApi(params: RolePageParams) {
  return requestClient.get<PageResult<RoleInfo>>(
    '/de-base-system/external/private/role/page',
    {
      params,
    },
  );
}

/**
 * 创建角色
 */
export async function createRoleApi(data: CreateRoleParams) {
  return requestClient.post(
    '/de-base-system/external/private/role/create',
    data,
  );
}

/**
 * 更新角色
 */
export async function updateRoleApi(data: UpdateRoleParams) {
  return requestClient.post(
    '/de-base-system/external/private/role/update',
    data,
  );
}

/**
 * 删除角色
 */
export async function deleteRoleApi(id: string) {
  return requestClient.post(
    `/de-base-system/external/private/role/delete?ids=${id}`,
  );
}

/**
 * 获取角色权限
 */
export async function getRolePermissionApi(roleId: string) {
  return requestClient.get<RolePermissionInfo>(
    '/de-base-system/external/private/role/feature',
    {
      params: { roleId },
    },
  );
}

/**
 * 保存角色权限
 */
export async function saveRolePermissionApi(data: {
  appIds?: string;
  featureIds: string;
  roleId: string;
}) {
  return requestClient.post(
    '/de-base-system/external/private/role/feature/update',
    data,
  );
}

/**
 * 保存数据资源权限（与功能权限 saveRolePermissionApi 分接口）
 */
export async function saveDataSourceApi(data: SaveDataSourceParams) {
  return requestClient.post(
    '/de-base-system/external/private/role/data-resource/save',
    data,
  );
}

/**
 * 获取角色数据权限配置数据
 */
export async function getDataSourceApi(roleId: string) {
  return requestClient.get<DataSourceInfo[]>(
    '/de-base-system/external/private/role/data-resource',
    {
      params: { roleId },
    },
  );
}

/**
 * 获取应用列表
 */
export async function getAppListApi() {
  return requestClient.get<{ records: AppInfo[] }>(
    '/de-base-system/external/private/app/page',
    {
      params: { current: 1, size: 1000 },
    },
  );
}

/**
 * 获取应用功能树
 */
export async function getAppFeatureTreeApi(appId: string) {
  return requestClient.get<FeatureInfo[]>(
    '/de-base-system/external/private/app-feature/tree',
    {
      params: { appId },
    },
  );
}

/**
 * 获取全部功能树（不需要 appId）
 */
export async function getAllFeatureTreeApi() {
  return requestClient.get<FeatureInfo[]>(
    '/de-base-system/external/private/mine/feature',
  );
}
