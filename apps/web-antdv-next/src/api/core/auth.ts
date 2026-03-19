import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    captchaId?: string;
    captchaValue?: string;
    pwd?: string;
    tenantId?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    token: string;
    multiTenant?: boolean;
    tenantList?: Array<{ tenantId: string; tenantName: string }>;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }

  /** 验证码接口返回值 */
  export interface CaptchaResult {
    captchaId: string;
    captchaImg: string;
  }

  export interface TenantItem {
    tenantId: string;
    tenantName: string;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/de-base-system/external/public/auth/login',
    data,
  );
}

/**
 * 获取验证码
 */
export async function getCaptchaApi() {
  return requestClient.get<AuthApi.CaptchaResult>(
    '/de-base-system/external/public/auth/captcha',
  );
}

/**
 * 获取租户列表
 */
export async function getTenantListApi() {
  return [
    {
      tenantId: '1',
      tenantName: '租户1',
    },
    {
      tenantId: '2',
      tenantName: '租户2',
    },
  ];
  return requestClient.get<AuthApi.TenantItem[]>(
    '/de-base-system/external/public/auth/tenant/list',
  );
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return requestClient.post('/de-base-system/external/public/auth/logout');
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}
