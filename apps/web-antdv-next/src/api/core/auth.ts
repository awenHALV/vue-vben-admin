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
    /** 登录失败可能返回 401，不应触发全局 doReAuthenticate → logout */
    { skipReAuthenticate: true },
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
  return requestClient.get<AuthApi.TenantItem[]>(
    '/de-base-system/external/public/auth/tenant/list',
  );
}

/** 已登录或登录后多租户选人场景：凭 tenantId 换发新 token */
export interface SwitchTenantParams {
  tenantId: number | string;
}

/**
 * 切换租户（公开接口）
 * POST /de-base-system/external/public/auth/switch-tenant
 */
export async function switchTenantPublicApi(data: SwitchTenantParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/de-base-system/external/public/auth/switch-tenant',
    data,
    { skipReAuthenticate: true },
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
