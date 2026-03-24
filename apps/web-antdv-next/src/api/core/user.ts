import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/** 当前用户修改密码 */
export interface UpdateMinePasswordParams {
  oldPwd: string;
  newPwd: string;
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>(
    '/de-base-system/external/private/mine/info',
  );
}

/**
 * 当前用户修改密码
 */
export async function updateMinePasswordApi(data: UpdateMinePasswordParams) {
  return requestClient.put('/de-base-system/external/private/mine/pwd', data);
}
