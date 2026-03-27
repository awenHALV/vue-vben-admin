import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    /**
     * 应用展示名（Logo、动态页标题后缀）：使用 i18n key，在 locales/langs/xx/app.json 中维护各语言文案。
     * 构建时 index.html 的静态 <title> 仍由 .env 的 VITE_APP_TITLE 注入（首屏/SEO），可与中文文案一致。
     */
    name: 'app.title',
    // 路由权限：frontend=前端路由表+角色过滤，不请求菜单接口；backend / mixed 才会走 getAllMenusApi
    accessMode: 'backend',
  },
});
