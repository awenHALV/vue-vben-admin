/**
 * 组织管理 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 组织信息 */
export interface OrgInfo {
  id: string;
  deptName: string;
  parentId?: string;
  internal?: string;
  code?: string;
  sort?: number;
  status?: number;
  remark?: string;
  hasChildren?: boolean;
  children?: OrgInfo[];
}

/** 组织树节点 */
export interface OrgTreeNode {
  id: string;
  deptName: string;
  parentId?: string;
  children?: OrgTreeNode[];
}

/** 创建组织参数 */
export interface CreateOrgParams {
  deptName: string;
  parentId?: string;
  internal?: string;
  code?: string;
  sort?: number;
  status?: number;
  remark?: string;
}

/** 更新组织参数 */
export interface UpdateOrgParams {
  id: string;
  deptName: string;
  parentId?: string;
  internal?: string;
  code?: string;
  sort?: number;
  status?: number;
  remark?: string;
}

// ==================== API 函数 ====================

/**
 * 获取组织树
 */
export async function getOrgTreeApi(params?: { deptName?: string }) {
  return requestClient.get<OrgInfo[]>('/de-base-system/external/private/dept/tree', { params });
}

/**
 * 获取部门树（别名）
 */
export const getDeptTreeApi = getOrgTreeApi;

/**
 * 创建组织
 */
export async function createOrgApi(data: CreateOrgParams) {
  return requestClient.post('/de-base-system/external/private/dept/create', data);
}

/**
 * 更新组织
 */
export async function updateOrgApi(data: UpdateOrgParams) {
  return requestClient.post('/de-base-system/external/private/dept/update', data);
}

/**
 * 删除组织
 */
export async function deleteOrgApi(ids: string[]) {
  return requestClient.post(`/de-base-system/external/private/dept/delete?ids=${ids.join(',')}`);
}