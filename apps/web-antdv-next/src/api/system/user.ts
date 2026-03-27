/**
 * 用户管理 API 接口
 */
import { requestClient } from '#/api/request';

// ==================== 类型定义 ====================

/** 用户信息 */
export interface UserInfo {
  id: string;
  account: string;
  name: string;
  phone?: string;
  email?: string;
  status: number;
  deptId?: string;
  deptName?: string;
  roleId?: string;
  roleName?: string;
  postId?: string;
  birthday?: string;
  userType?: string;
  tenantId?: string;
  feishu?: string;
  code?: string;
}

/** 用户分页查询参数 */
export interface UserPageParams {
  current: number;
  size: number;
  account?: string;
  name?: string;
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

/** 创建用户参数 */
export interface CreateUserParams {
  account: string;
  pwd: string;
  password2: string;
  name: string;
  phone: string;
  email?: string;
  deptId: string;
  roleId: string;
  postId?: string;
  birthday?: string;
  userType?: string;
  tenantId?: string;
  feishu?: string;
  code?: string;
}

/** 更新用户参数 */
export interface UpdateUserParams {
  id: string;
  account: string;
  name: string;
  phone: string;
  email?: string;
  deptId: string;
  roleId: string;
  postId?: string;
  status: number;
  birthday?: string;
  userType?: string;
  tenantId?: string;
  feishu?: string;
  code?: string;
}

/** 重置密码参数 */
export interface EditPasswordParams {
  id: string;
  pwd: string;
  password2: string;
}

/** 部门树节点 */
export interface DeptTreeNode {
  id: string;
  deptName: string;
  parentId?: string;
  children?: DeptTreeNode[];
}

/** 角色信息 */
export interface RoleInfo {
  id: string;
  roleName: string;
  roleAlias?: string;
  parentId?: string;
  children?: RoleInfo[];
}

/** 用户消息 */
export interface MessageTypeInfo {
  acceptMessageType: string;
  acceptMessageChannel: string;
}
// ==================== API 函数 ====================

/**
 * 获取用户分页列表
 */
export async function getUserPageApi(params: UserPageParams) {
  return requestClient.get<PageResult<UserInfo>>(
    '/de-base-system/external/private/user/page',
    { params },
  );
}

/**
 * 创建用户
 */
export async function createUserApi(data: CreateUserParams) {
  return requestClient.post('/de-base-system/external/private/user/create', data);
}

/**
 * 获取用户消息接收方式
 */
export async function getMessageTyperApi(id: string) {
  return requestClient.get(`/de-base-system/external/private/user/${id}/messageType`);
}
/**
 * 更新用户消息接收方式
 */
export async function updateMessageTyperApi(id: string,data: MessageTypeInfo) {
  return requestClient.put(`/de-base-system/external/private/user/${id}/messageType`,data);
}

/**
 * 更新用户
 */
export async function updateUserApi(data: UpdateUserParams) {
  return requestClient.post('/de-base-system/external/private/user/update', data);
}

/**
 * 删除用户
 * @param ids 用户ID数组
 */
export async function deleteUserApi(ids: string[]) {
  return requestClient.post(`/de-base-system/external/private/user/delete?ids=${ids.join(',')}`);
}

/**
 * 重置密码
 */
export async function editPasswordApi(data: EditPasswordParams) {
  return requestClient.post('/de-base-system/external/private/user/pwd/update', data);
}

/**
 * 批量导入用户
 */
export async function importUserApi(data: FormData) {
  return requestClient.post('/de-base-system/external/private/user/import', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 获取部门树
 */
export async function getDeptTreeApi() {
  return requestClient.get<DeptTreeNode[]>('/de-base-system/external/private/dept/tree');
}

/**
 * 获取部门下的角色列表
 */
export async function getDeptRolesApi(deptId: string) {
  return requestClient.get<RoleInfo[]>(`/de-base-system/external/private/dept/${deptId}/role`);
}

/**
 * 下载用户导入模板
 */
export function getUserImportTemplateUrl(): Promise<Blob> {
  return requestClient.download('/de-base-system/external/private/user/import/template');
}
