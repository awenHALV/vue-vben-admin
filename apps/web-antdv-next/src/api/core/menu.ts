import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';
import website from '#/wujie-config/website';

/** 后端返回的菜单数据结构 */
export interface BackendMenuItem {
  children?: BackendMenuItem[] | null;
  featureCode: string;
  featureIcon?: string;
  featureName: string;
  featureNameEn?: string;
  featureType: string;
  id: number | string;
  parentId: null | number | string;
  routePath: string;
  sort?: number;
}

/**
 * routePath 首段是否在基座配置的子应用 projectCode 列表中（与 wujie website.projectCodes 一致）
 * 例如 /vpp/park/child → 首段 vpp 表示子应用，由 Wujie 加载，而非主应用 views 下的页面
 */
function getMicroProjectCodeFromRoutePath(routePath: string): null | string {
  const segments = routePath.replace(/^\//, '').split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  const first = segments[0] ?? '';
  if (!first) {
    return null;
  }
  return website.projectCodes.includes(first) ? first : null;
}

/** 基座 path 去掉 /{projectCode} 前缀，得到子应用内 path（子应用 router 配置为 /xxx/yy） */
function stripMicroProjectPrefix(
  routePath: string,
  projectCode: string,
): string {
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  const prefix = `/${projectCode}`;
  if (normalized === prefix) {
    return '/';
  }
  if (normalized.startsWith(`${prefix}/`)) {
    return normalized.slice(prefix.length) || '/';
  }
  return normalized;
}

/**
 * 嵌套路由：子项应使用相对 path（如 tenant），不要用 /system/tenant，
 * 否则在父级为 /system 时，部分环境下匹配异常导致 404。
 * 组件路径仍用完整 routePath 推断 views 下的文件。
 */
function toNestedRoutePath(
  absolutePath: string,
  parentAbsolutePath?: string,
): string {
  const full = absolutePath.startsWith('/') ? absolutePath : `/${absolutePath}`;
  if (!parentAbsolutePath) {
    return full;
  }
  const parent = parentAbsolutePath.startsWith('/')
    ? parentAbsolutePath
    : `/${parentAbsolutePath}`;
  const parentNorm = parent.replace(/\/$/, '') || '/';
  if (full === parentNorm) {
    return '';
  }
  if (full.startsWith(`${parentNorm}/`)) {
    return full.slice(parentNorm.length + 1);
  }
  return full.replace(/^\//, '');
}

function getMicroAppBaseUrl(projectCode: string): string {
  const envKey = `VITE_APP_${projectCode.toUpperCase()}` as keyof ImportMetaEnv;
  const raw = import.meta.env[envKey];
  if (typeof raw !== 'string' || !raw) {
    console.warn(
      `[menu] 子应用「${projectCode}」未配置环境变量 ${String(envKey)}，Wujie 无法拼接加载地址`,
    );
    return '';
  }
  return raw.replace(/\/$/, '');
}

/** 子应用完整入口 URL：env 根地址 + 子应用内 path */
function buildMicroUrl(routePath: string, projectCode: string): string {
  const base = getMicroAppBaseUrl(projectCode);
  const childPath = stripMicroProjectPrefix(routePath, projectCode);
  if (!base) {
    return '';
  }
  if (childPath === '/' || childPath === '') {
    return `${base}/`;
  }
  return `${base}${childPath.startsWith('/') ? childPath : `/${childPath}`}`;
}

/**
 * 将后端菜单数据映射为 Vben 路由格式
 * - featureCode → name
 * - routePath   → path
 * - featureName / featureIcon / featureNameEn → meta
 * - 有子菜单的父级节点使用 BasicLayout，叶子节点根据 routePath 推断 component
 * - 叶子且 routePath 首段 ∈ website.projectCodes → 使用 micro/index（Wujie），并写入 meta.microName / meta.microUrl
 */
function mapMenuToRoute(
  item: BackendMenuItem,
  parentAbsoluteRoutePath?: string,
): RouteRecordStringComponent {
  const menuChildren = (item.children ?? []).filter(
    (child) => child.featureType === 'MENU',
  );
  const hasChildren = menuChildren.length > 0;

  let rawPath = '';
  if (item.routePath) {
    rawPath = item.routePath.startsWith('/')
      ? item.routePath
      : `/${item.routePath}`;
  }

  const pathForRouter = toNestedRoutePath(rawPath, parentAbsoluteRoutePath);

  const microCode =
    !hasChildren && rawPath ? getMicroProjectCodeFromRoutePath(rawPath) : null;

  // 叶子路由：本地页面按「完整」routePath 推断 views/.../index.vue；子应用走 Wujie 承载页 micro/index.vue
  let inferredComponent: string;
  if (hasChildren) {
    inferredComponent = 'BasicLayout';
  } else if (rawPath) {
    inferredComponent = microCode
      ? 'micro/index'
      : `${rawPath.replace(/^\//, '')}/index`;
  } else {
    inferredComponent = '/';
  }

  return {
    name: item.featureCode,
    path: pathForRouter,
    component: inferredComponent,
    meta: {
      /** 默认中文名；展示时由 resolveMenuTitle 按 locale + featureNameEn 解析 */
      title: item.featureName,
      icon: item.featureIcon || undefined,
      order: item.sort,
      featureName: item.featureName,
      featureNameEn: item.featureNameEn,
      ...(microCode
        ? {
            microName: microCode,
            microUrl: buildMicroUrl(rawPath, microCode),
          }
        : {}),
    },
    children: hasChildren
      ? menuChildren.map((child) => mapMenuToRoute(child, rawPath))
      : [],
  } as RouteRecordStringComponent;
}

/**
 * 获取「我的功能」原始树（与 {@link getAllMenusApi} 同源接口）
 * 含 MENU / BUTTON / API 等全部节点，用于租户勾选能力等场景
 */
export async function getMineFeaturesRawApi(): Promise<BackendMenuItem[]> {
  const rawList = await requestClient.get<BackendMenuItem[]>(
    '/de-base-system/external/private/mine/feature',
  );
  return Array.isArray(rawList) ? rawList : [];
}

/** Ant Design Vue TreeSelect 的 treeData 节点 */
export interface AppFeatureTreeNode {
  children?: AppFeatureTreeNode[];
  title: string;
  value: string;
}

export interface MapMenusToFeatureTreeOptions {
  /** 是否优先展示英文名（与路由 meta 逻辑一致） */
  useEnglishName: boolean;
  t: (key: string) => string;
}

function featureTypeLabel(
  featureType: string,
  t: (key: string) => string,
): string {
  const ft = String(featureType).toUpperCase();
  if (ft === 'MENU') {
    return t('menu.type.menu');
  }
  if (ft === 'BUTTON') {
    return t('menu.type.button');
  }
  if (ft === 'API') {
    return t('menu.type.api');
  }
  return featureType;
}

/**
 * 将后端功能树转为 TreeSelect 数据，标题附带「菜单/按钮/接口」标识
 */
export function mapBackendMenusToFeatureTree(
  items: BackendMenuItem[],
  options: MapMenusToFeatureTreeOptions,
): AppFeatureTreeNode[] {
  const mapOne = (item: BackendMenuItem): AppFeatureTreeNode => {
    const baseName =
      options.useEnglishName && item.featureNameEn
        ? item.featureNameEn
        : item.featureName;
    const typeLabel = featureTypeLabel(item.featureType, options.t);
    const rawChildren = item.children ?? [];
    const childList = Array.isArray(rawChildren)
      ? rawChildren.filter(Boolean)
      : [];
    const childrenNodes = childList.map((c) => mapOne(c));

    const node: AppFeatureTreeNode = {
      title: `${baseName} (${typeLabel})`,
      value: String(item.id),
    };
    if (childrenNodes.length > 0) {
      node.children = childrenNodes;
    }
    return node;
  };

  return (items ?? []).filter(Boolean).map((item) => mapOne(item));
}

/**
 * 获取用户所有菜单（后端模式）
 * 接口返回后端自定义格式，此处统一做字段映射转换为 Vben 标准路由格式
 */
export async function getAllMenusApi(): Promise<RouteRecordStringComponent[]> {
  const rawList = await getMineFeaturesRawApi();
  return rawList
    .filter((item) => item.featureType === 'MENU')
    .map((item) => mapMenuToRoute(item));
}

/** 菜单管理页分页参数 */
export interface MenuPageParams {
  current?: number;
  featureName?: string;
  size?: number;
}

/** 分页响应结构（根据后端实际返回结构调整） */
export interface MenuPageResult {
  items: BackendMenuItem[];
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
 * 获取菜单列表（分页，用于菜单管理页）
 * - 不带 featureType 过滤，同时展示 MENU 和 BUTTON 类型
 * - 支持按菜单名称搜索及分页
 */
export async function getRawMenusApi(
  params: MenuPageParams = {},
): Promise<MenuPageResult> {
  const { current = 1, size = 10, featureName } = params;
  const query = new URLSearchParams({
    current: String(current),
    size: String(size),
    ...(featureName ? { featureName } : {}),
  });

  const res = await requestClient.get<
    BackendMenuItem[] | BackendPagedResult<BackendMenuItem> | MenuPageResult
  >(`/de-base-system/external/private/app-feature/page?${query.toString()}`);

  // 兼容后端直接返回数组的情况
  if (Array.isArray(res)) {
    return {
      items: res as unknown as BackendMenuItem[],
      total: (res as unknown as BackendMenuItem[]).length,
    };
  }
  if (res && !Array.isArray(res)) {
    const pagedRes = res as BackendPagedResult<BackendMenuItem>;
    // 新分页结构：{ records, total, current, size, ... }
    if (Array.isArray(pagedRes.records)) {
      return {
        items: pagedRes.records,
        total: pagedRes.total ?? pagedRes.records.length,
      };
    }
    // 兼容旧结构：{ items, total }
    if (Array.isArray((res as MenuPageResult).items)) {
      return res as MenuPageResult;
    }
  }
  return { items: [], total: 0 };
}

/** 创建菜单/功能参数 */
export interface CreateFeatureParams {
  parentId: null | number | string;
  featureType: string;
  featureCode: string;
  featureName: string;
  featureNameEn?: string;
  featureIcon?: string;
  sort?: number;
  routePath?: string;
}

export interface UpdateFeatureParams extends CreateFeatureParams {
  id: number | string;
}

/**
 * 创建菜单/功能
 */
export async function createFeatureApi(
  params: CreateFeatureParams,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/app-feature/create',
    params,
  );
}

/**
 * 更新菜单/功能
 */
export async function updateFeatureApi(
  params: UpdateFeatureParams,
): Promise<void> {
  await requestClient.post(
    '/de-base-system/external/private/app-feature/update',
    params,
  );
}

/**
 * 删除菜单/功能（支持单个或批量）
 */
export async function deleteFeatureApi(
  ids: Array<number | string> | number | string,
): Promise<void> {
  const normalizedIds = Array.isArray(ids) ? ids.join(',') : String(ids);
  await requestClient.post(
    `/de-base-system/external/private/app-feature/delete?ids=${encodeURIComponent(
      normalizedIds,
    )}`,
  );
}
