/**
 * 组织管理页按钮与后端「菜单 → 直接子 BUTTON」的 featureCode 对齐。
 * 在菜单管理中把对应 BUTTON 挂在「租户管理」MENU 下即可生效。
 */
export const ORG_PAGE_BUTTON_CODES = {
  addSub: 'org:addSub',
  detail: 'org:detail',
  edit: 'org:edit',
  delete: 'org:delete',
  assetConfig: 'org:assetConfig',
} as const;
