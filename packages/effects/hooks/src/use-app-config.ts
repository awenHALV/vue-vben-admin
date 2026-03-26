import type {
  ApplicationConfig,
  VbenAdminProAppConfigRaw,
} from '@vben/types/global';

/** 与 .env 中 `VITE_GLOB_API_URL` 配合：打包后按当前访问站点解析接口根路径 */
const CURRENT_ORIGIN_MARKER = '__USE_CURRENT_ORIGIN__';

function resolveViteGlobApiUrl(url: string): string {
  if (!url.startsWith(CURRENT_ORIGIN_MARKER)) {
    return url;
  }
  if (typeof window === 'undefined') {
    return url;
  }
  const suffix =
    url === CURRENT_ORIGIN_MARKER
      ? '/api'
      : url.slice(CURRENT_ORIGIN_MARKER.length);
  const path = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `${window.location.origin}${path}`;
}

/**
 * 由 vite-inject-app-config 注入的全局配置
 */
export function useAppConfig(
  env: Record<string, any>,
  isProduction: boolean,
): ApplicationConfig {
  // 生产环境下，直接使用 window._VBEN_ADMIN_PRO_APP_CONF_ 全局变量
  const config = isProduction
    ? window._VBEN_ADMIN_PRO_APP_CONF_
    : (env as VbenAdminProAppConfigRaw);

  const {
    VITE_GLOB_API_URL,
    VITE_GLOB_AUTH_DINGDING_CORP_ID,
    VITE_GLOB_AUTH_DINGDING_CLIENT_ID,
  } = config;

  const applicationConfig: ApplicationConfig = {
    apiURL: resolveViteGlobApiUrl(VITE_GLOB_API_URL),
    auth: {},
  };
  if (VITE_GLOB_AUTH_DINGDING_CORP_ID && VITE_GLOB_AUTH_DINGDING_CLIENT_ID) {
    applicationConfig.auth.dingding = {
      clientId: VITE_GLOB_AUTH_DINGDING_CLIENT_ID,
      corpId: VITE_GLOB_AUTH_DINGDING_CORP_ID,
    };
  }

  return applicationConfig;
}
