import type { RouteRecordStringComponent } from '@vben/types';

import { preferences } from '@vben/preferences';

import { requestClient } from '#/api/request';

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
 * 将后端菜单数据映射为 Vben 路由格式
 * - featureCode → name
 * - routePath   → path
 * - featureName / featureIcon / featureNameEn → meta
 * - 有子菜单的父级节点使用 BasicLayout，叶子节点根据 routePath 推断 component
 */
function mapMenuToRoute(item: BackendMenuItem): RouteRecordStringComponent {
  const menuChildren = (item.children ?? []).filter(
    (child) => child.featureType === 'MENU',
  );
  const hasChildren = menuChildren.length > 0;

  // 叶子路由：根据 routePath 推断 component 路径
  // 例如 /system/menu → views/system/menu/index.vue → 归一化后为 system/menu/index.vue
  let inferredComponent: string;
  if (hasChildren) {
    inferredComponent = 'BasicLayout';
  } else if (item.routePath) {
    inferredComponent = `${item.routePath.replace(/^\//, '')}/index`;
  } else {
    inferredComponent = '/';
  }

  return {
    name: item.featureCode,
    path: item.routePath,
    component: inferredComponent,
    meta: {
      title:
        preferences.app.locale === 'en-US' && item.featureNameEn
          ? item.featureNameEn
          : item.featureName,
      icon: item.featureIcon || undefined,
      order: item.sort,
      // 额外业务字段
      featureNameEn: item.featureNameEn,
    },
    children: hasChildren
      ? menuChildren.map((child) => mapMenuToRoute(child))
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
