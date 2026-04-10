import type { ComponentRecordType } from '@vben/types';

/**
 * 业务组件映射表
 * 用于将后台返回的 featureCode 映射到前端具体的组件文件
 *
 * 这样做的好处是：
 * 1. 路由路径（routePath）可以随意修改，而不需要移动前端文件
 * 2. 映射关系清晰，便于维护
 *
 * key: 后台定义的 featureCode
 * value: 对应 views 录下的组件路径（相对于 src/views）
 */
export const FEATURE_COMPONENT_MAP: Record<string, string> = {
  // 测试用例 1：系统角色映射
  SystemRole: 'system/user-center/role/index',
  // 测试用例 2：组织/代理中心映射
  SystemAgency: 'system/user-center/agency/index',
};

/**
 * 获取所有已配置映射的 featureCodes
 */
export const mappedFeatureCodes = Object.keys(FEATURE_COMPONENT_MAP);

/**
 * 转换全局 Glob 导入的组件 Map
 * 将原始的 '../views/system/role/index.vue' 键映射为 'SystemRole'
 */
export function transformComponentMap(
  pageMap: ComponentRecordType,
): ComponentRecordType {
  const newMap: ComponentRecordType = { ...pageMap };

  Object.entries(FEATURE_COMPONENT_MAP).forEach(([featureCode, viewPath]) => {
    // 构造 glob 匹配的路径格式
    const fullPath = `../views/${viewPath}.vue`;
    if (pageMap[fullPath]) {
      // 关键修复：框架逻辑会补全 .vue 后缀进行匹配，所以这里 Key 也要带上后缀
      newMap[`${featureCode}.vue`] = pageMap[fullPath];
    }
  });
  // console.log('newMap', newMap);
  return newMap;
}
