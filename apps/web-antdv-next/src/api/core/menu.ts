import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/** 后端返回的菜单数据结构 */
interface BackendMenuItem {
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
