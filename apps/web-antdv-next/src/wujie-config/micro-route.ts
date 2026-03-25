import domins from './app.config';
import website from './website';

/**
 * 从基座 routePath 取首段：/vpp/park/child → vpp
 */
export function getRoutePathFirstSegment(
  routePath: string,
): string | undefined {
  const trimmed = routePath.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const seg = normalized.split('/').find(Boolean);
  return seg || undefined;
}

/**
 * 是否微前端：仅看 routePath 首段是否在 website.projectCodes 中（与菜单 featureCode 无关）
 * 返回 website 里配置的 canonical projectCode（大小写与 env / domins 一致）
 */
export function getMicroProjectCodeFromRoutePath(
  routePath: string,
): string | undefined {
  const first = getRoutePathFirstSegment(routePath);
  if (!first) {
    return undefined;
  }
  return website.projectCodes.find(
    (code) => code.toLowerCase() === first.toLowerCase(),
  );
}

/**
 * 基座 routePath 形如 /{projectCode}/xxx/yy，子应用内路由为 /xxx/yy（去掉首段 projectCode）
 */
export function stripProjectPrefixFromRoutePath(
  routePath: string,
  projectCode: string,
): string {
  const path = routePath.trim();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) {
    return '/';
  }
  const firstSeg = segments[0];
  if (!firstSeg || firstSeg.toLowerCase() !== projectCode.toLowerCase()) {
    console.warn(
      `[micro] routePath 首段与 projectCode(${projectCode}) 不一致，将整段作为子应用路径: ${normalized}`,
    );
    return normalized;
  }
  const rest = segments.slice(1);
  if (rest.length === 0) {
    return '/';
  }
  return `/${rest.join('/')}`;
}

/**
 * 子应用完整入口 URL：env 中的域名（如 VITE_APP_VPP）+ 子应用内 path
 */
export function buildMicroUrl(
  projectCode: string,
  hostRoutePath: string,
): string | undefined {
  const base = domins[projectCode];
  if (!base) {
    console.warn(
      `[micro] 未配置子应用域名，请设置环境变量 VITE_APP_${projectCode.toUpperCase()}`,
    );
    return undefined;
  }
  const subPath = stripProjectPrefixFromRoutePath(hostRoutePath, projectCode);
  const baseTrim = base.replace(/\/+$/, '');
  const pathPart = subPath.startsWith('/') ? subPath : `/${subPath}`;
  return `${baseTrim}${pathPart}`;
}
