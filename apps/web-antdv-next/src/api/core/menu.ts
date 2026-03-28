import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';
import {
  buildMicroUrl,
  getMicroProjectCodeFromRoutePath,
} from '#/wujie-config/micro-route';

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

function isMenuFeatureType(featureType: string | undefined): boolean {
  return (
    String(featureType ?? '')
      .toUpperCase()
      .trim() === 'MENU'
  );
}

function isButtonFeatureType(featureType: string | undefined): boolean {
  return (
    String(featureType ?? '')
      .toUpperCase()
      .trim() === 'BUTTON'
  );
}

/**
 * 与页面权限 map 的 key、当前路由 path 比对时统一使用
 */
export function normalizeMenuPermissionPath(routePath: string): string {
  const t = String(routePath ?? '').trim();
  if (!t) {
    return '';
  }
  const withSlash = t.startsWith('/') ? t : `/${t}`;
  const noTrail = withSlash.replace(/\/+$/, '');
  return noTrail || '/';
}

export interface MenuButtonPermissionSnapshot {
  allButtonCodes: string[];
  menuPathToDirectButtonCodes: Record<string, string[]>;
}

/** 最近一次 {@link getAllMenusApi} 解析出的按钮权限，供路由模块写入 accessStore */
let menuButtonPermissionSnapshot: MenuButtonPermissionSnapshot | null = null;

/**
 * 取出并清空快照（避免重复应用到旧数据）
 */
export function takeMenuButtonPermissionSnapshot(): MenuButtonPermissionSnapshot | null {
  const s = menuButtonPermissionSnapshot;
  menuButtonPermissionSnapshot = null;
  return s;
}

/**
 * 遍历功能树：每个 MENU 只收集其直接子级中的 BUTTON，不把子 MENU 下的 BUTTON 归到父级。
 */
export function collectMenuButtonPermissionsFromRaw(
  items: BackendMenuItem[],
): MenuButtonPermissionSnapshot {
  const pathToCodes = new Map<string, Set<string>>();
  const allCodes = new Set<string>();

  function visitMenuNode(menu: BackendMenuItem): void {
    let rawPath = '';
    if (menu.routePath) {
      rawPath = menu.routePath.startsWith('/')
        ? menu.routePath
        : `/${menu.routePath}`;
    }
    const pathKey = normalizeMenuPermissionPath(rawPath);
    const children = menu.children ?? [];
    for (const child of children) {
      if (!child) {
        continue;
      }
      if (isButtonFeatureType(child.featureType)) {
        const code = String(child.featureCode ?? '').trim();
        if (code && pathKey) {
          allCodes.add(code);
          let set = pathToCodes.get(pathKey);
          if (!set) {
            set = new Set<string>();
            pathToCodes.set(pathKey, set);
          }
          set.add(code);
        }
      } else if (isMenuFeatureType(child.featureType)) {
        visitMenuNode(child);
      }
    }
  }

  for (const item of items ?? []) {
    if (item && isMenuFeatureType(item.featureType)) {
      visitMenuNode(item);
    }
  }

  const menuPathToDirectButtonCodes: Record<string, string[]> = {};
  for (const [path, set] of pathToCodes) {
    menuPathToDirectButtonCodes[path] = [...set];
  }

  return {
    allButtonCodes: [...allCodes],
    menuPathToDirectButtonCodes,
  };
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

/**
 * 判断 pathSegments 是否以 parentSegments 为前缀（逐段比较，忽略大小写）
 */
function pathSegmentsStartWithParent(
  pathSegments: string[],
  parentSegments: string[],
): boolean {
  if (pathSegments.length < parentSegments.length) {
    return false;
  }
  return parentSegments.every(
    (seg, i) => seg.toLowerCase() === pathSegments[i]?.toLowerCase(),
  );
}

/**
 * 将后端按层级拆分的「相对」routePath 解析为基座完整路径。
 * 使用路径段拼接，避免仅靠字符串 startsWith 时漏拼中间段（如父级 /vpp/system + 本级 /region → /vpp/system/region）。
 * 若本级已是「从根开始的完整路径」且以父路径为前缀，则直接使用。
 */
function resolveMenuAbsoluteRoutePath(
  routePath: string | undefined,
  parentAbsoluteRoutePath?: string,
): string {
  const trimmed = String(routePath ?? '').trim();
  if (!trimmed) {
    return parentAbsoluteRoutePath ?? '';
  }

  const raw = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const rawSegments = raw.split('/').filter(Boolean);

  if (!parentAbsoluteRoutePath) {
    return raw;
  }

  const parentNorm = parentAbsoluteRoutePath.replace(/\/+$/, '') || '/';
  if (parentNorm === '/') {
    return raw;
  }

  const parentSegments = parentNorm.split('/').filter(Boolean);

  // 本级已包含完整父链（后端直接给绝对路径）
  if (
    rawSegments.length >= parentSegments.length &&
    pathSegmentsStartWithParent(rawSegments, parentSegments)
  ) {
    return `/${rawSegments.join('/')}`;
  }

  // 相对片段：拼在父级绝对路径之后（/vpp + /system → /vpp/system；/vpp/system + /region → /vpp/system/region）
  return `/${[...parentSegments, ...rawSegments].join('/')}`;
}

/**
 * 将后端菜单数据映射为 Vben 路由格式
 * - featureCode → name
 * - routePath   → path（支持分层相对地址，最终拼成 /vpp/system/region 这类绝对路径）
 * - featureName / featureIcon / featureNameEn → meta
 * - 有子菜单且非微前端的父级用 BasicLayout；路径首段 ∈ website.projectCodes（如 vpp）的父级也用 micro/index，避免 BasicLayout 再包一层
 * - 叶子：非微前端按 routePath 推断 views；微前端 → micro/index，并写入 meta.microName / meta.microUrl
 */
function mapMenuToRoute(
  item: BackendMenuItem,
  parentAbsoluteRoutePath?: string,
): RouteRecordStringComponent {
  const menuChildren = (item.children ?? []).filter((child) =>
    isMenuFeatureType(child.featureType),
  );
  const hasChildren = menuChildren.length > 0;

  const absoluteRoutePath = resolveMenuAbsoluteRoutePath(
    item.routePath,
    parentAbsoluteRoutePath,
  );

  const pathForRouter = toNestedRoutePath(
    absoluteRoutePath,
    parentAbsoluteRoutePath,
  );

  /**
   * 微前端：用拼接后的完整基座路径判断首段是否为 projectCode（如 vpp）；
   * 父级、叶子均参与判断，便于有子菜单的微应用目录不用 BasicLayout。
   * 外链 http/https 不走微前端。
   */
  const microCode =
    absoluteRoutePath && !absoluteRoutePath.toLowerCase().startsWith('http')
      ? getMicroProjectCodeFromRoutePath(absoluteRoutePath)
      : undefined;

  let inferredComponent: string;
  if (hasChildren && !microCode) {
    inferredComponent = 'BasicLayout';
  } else if (absoluteRoutePath) {
    inferredComponent = microCode
      ? 'micro/index'
      : `${absoluteRoutePath.replace(/^\//, '')}/index`;
  } else {
    inferredComponent = '/';
  }

  const microUrl = microCode
    ? buildMicroUrl(microCode, absoluteRoutePath)
    : undefined;

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
      featureIcon: item.featureIcon || undefined,
      ...(microCode
        ? {
            microName: microCode,
            microUrl: microUrl ?? '',
          }
        : {}),
    },
    children: hasChildren
      ? menuChildren.map((child) => mapMenuToRoute(child, absoluteRoutePath))
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
  menuButtonPermissionSnapshot = collectMenuButtonPermissionsFromRaw(rawList);
  return rawList
    .filter((item) => isMenuFeatureType(item.featureType))
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
