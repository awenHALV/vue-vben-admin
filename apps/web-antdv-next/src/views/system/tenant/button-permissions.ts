/**
 * 租户管理页按钮与后端「菜单 → 直接子 BUTTON」的 featureCode 对齐。
 * 在菜单管理中把对应 BUTTON 挂在「租户管理」MENU 下即可生效。
 */
export const TENANT_PAGE_BUTTON_CODES = {
  add: 'tenant:add',
  changeTenant: 'tenant:switch',
  detail: 'tenant:detail',
  edit: 'tenant:edit',
  menuConfig: 'tenant:menu',
} as const;
