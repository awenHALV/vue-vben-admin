/**
 * 解析菜单/面包屑/标签页展示标题（支持 i18n key、纯文案、后端双语 featureName/featureNameEn）
 */
export interface ResolveMenuTitleOptions {
  locale: string;
  t: (key: string) => string;
  te: (key: string) => boolean;
}

export interface MenuTitleSource {
  title?: string;
  name?: string;
  featureName?: string;
  featureNameEn?: string;
}

export function resolveMenuTitle(
  source: MenuTitleSource | undefined,
  options: ResolveMenuTitleOptions,
): string {
  if (!source) {
    return '';
  }
  const { featureName, featureNameEn, title, name } = source;
  if (featureName && featureNameEn) {
    return options.locale === 'en-US' ? featureNameEn : featureName;
  }
  const raw = (title || name || '') as string;
  if (!raw) {
    return '';
  }
  return options.te(raw) ? options.t(raw) : raw;
}
