import type { RouteRecordStringComponent } from '@vben/types';

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
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  // 叶子路由：根据 routePath 推断 component 路径
  // 例如 /system/menu → views/system/menu/index.vue → 归一化后为 system/menu/index.vue
  const inferredComponent = hasChildren
    ? 'BasicLayout'
    : `${item.routePath.replace(/^\//, '')}/index`;

  return {
    name: item.featureCode,
    path: item.routePath,
    component: inferredComponent,
    meta: {
      title: item.featureName,
      icon: item.featureIcon || undefined,
      order: item.sort,
      // 额外业务字段
      featureNameEn: item.featureNameEn,
    },
    children: hasChildren ? item.children!.map(mapMenuToRoute) : undefined,
  } as RouteRecordStringComponent;
}

/**
 * 获取用户所有菜单（后端模式）
 * 接口返回后端自定义格式，此处统一做字段映射转换为 Vben 标准路由格式
 */
export async function getAllMenusApi(): Promise<RouteRecordStringComponent[]> {
  const rawList = await requestClient.get<BackendMenuItem[]>(
    '/de-base-system/external/private/mine/feature?featureType=MENU',
  );

  if (!Array.isArray(rawList)) return [];

  return rawList.map(mapMenuToRoute);
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

  const res = await requestClient.get<MenuPageResult>(
    `/de-base-system/external/private/mine/feature?${query.toString()}`,
  );

  // 兼容后端直接返回数组的情况
  if (Array.isArray(res)) {
    return {
      items: res as unknown as BackendMenuItem[],
      total: (res as unknown as BackendMenuItem[]).length,
    };
  }
  return res ?? { items: [], total: 0 };
}

/** 创建菜单/功能参数 */
export interface CreateFeatureParams {
  parentId: number | string | null;
  featureType: string;
  featureCode: string;
  featureName: string;
  featureNameEn?: string;
  featureIcon?: string;
  sort?: number;
  routePath?: string;
}

/**
 * 创建菜单/功能
 */
export async function createFeatureApi(
  params: CreateFeatureParams,
): Promise<void> {
  await requestClient.post('/de-base-system/external/private/app-feature/create', params);
}
