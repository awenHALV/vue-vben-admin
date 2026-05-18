<script lang="ts" setup>
import type { BreadcrumbStyleType } from '@vben/types';

import type { IBreadcrumb } from '@vben-core/shadcn-ui';

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { $t, $te, useI18n } from '@vben/locales';
import { getTabKey, useAccessStore, useTabbarStore } from '@vben/stores';
import { resolveMenuTitle } from '@vben/utils';

import { VbenBreadcrumbView } from '@vben-core/shadcn-ui';

interface Props {
  hideWhenOnlyOne?: boolean;
  showHome?: boolean;
  showIcon?: boolean;
  type?: BreadcrumbStyleType;
}

const props = withDefaults(defineProps<Props>(), {
  showHome: false,
  showIcon: false,
  type: 'normal',
});

const route = useRoute();
const router = useRouter();
const tabbarStore = useTabbarStore();
const accessStore = useAccessStore();
const { locale } = useI18n();

type MenuRecordLike = {
  children?: MenuRecordLike[];
  icon?: unknown;
  meta?: Record<string, unknown>;
  name?: string;
  path?: string;
  title?: string;
};

function normalizePath(p: string): string {
  const s = String(p ?? '').trim();
  if (!s) {
    return '';
  }
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

/**
 * 从菜单树中找出与 currentPath 最匹配（最长前缀命中）的菜单节点，并返回其祖先链。
 * 用于微前端详情深链（不在菜单路由表中）时补全面包屑层级。
 */
function findMenuChainByPath(
  menus: MenuRecordLike[],
  currentPath: string,
): MenuRecordLike[] {
  const target = normalizePath(currentPath);
  if (!target) {
    return [];
  }

  let bestChain: MenuRecordLike[] = [];
  let bestLen = 0;

  function visit(nodes: MenuRecordLike[], parents: MenuRecordLike[]) {
    for (const node of nodes) {
      if (!node) {
        continue;
      }
      const nodePath = normalizePath(String(node.path ?? ''));
      const chain = [...parents, node];

      if (nodePath) {
        const hit = target === nodePath || target.startsWith(`${nodePath}/`);
        if (hit && nodePath.length > bestLen) {
          bestLen = nodePath.length;
          bestChain = chain;
        }
      }

      if (node.children?.length) {
        visit(node.children, chain);
      }
    }
  }

  visit(menus, []);
  return bestChain;
}

/**
 * 从菜单树中查找指定路径的菜单项
 * @param menus 菜单树
 * @param targetPath 目标路径
 * @returns 找到的菜单项
 */
function findMenuByPath(
  menus: MenuRecordLike[],
  targetPath: string,
): MenuRecordLike | undefined {
  const normalizedTarget = normalizePath(targetPath);
  if (!normalizedTarget) {
    return undefined;
  }

  for (const menu of menus) {
    const menuPath = normalizePath(String(menu.path ?? ''));
    if (menuPath && menuPath === normalizedTarget) {
      return menu;
    }
    if (menu.children?.length) {
      const found = findMenuByPath(menu.children, targetPath);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

const breadcrumbs = computed((): IBreadcrumb[] => {
  const matched = route.matched;
  const currentPath = route.path;

  const resultBreadcrumb: IBreadcrumb[] = [];

  for (const match of matched) {
    const { meta, name: routeName, path } = match;
    const {
      featureName: metaFeatureName,
      featureNameEn: metaFeatureNameEn,
      hideChildrenInMenu,
      hideInBreadcrumb,
      icon,
      title,
    } = meta || {};
    if (hideInBreadcrumb || hideChildrenInMenu || !path) {
      continue;
    }

    // 优先从 route.meta 获取，如果没有则从菜单树中查找
    let featureName = metaFeatureName as string | undefined;
    let featureNameEn = metaFeatureNameEn as string | undefined;

    // 如果 meta 中没有 featureName，尝试从 accessMenus 中查找
    if (!featureName && accessStore.accessMenus.length > 0) {
      const menuItem = findMenuByPath(accessStore.accessMenus as MenuRecordLike[], path);
      if (menuItem) {
        featureName = (menuItem.meta?.featureName ?? menuItem.featureName) as string | undefined;
        featureNameEn = (menuItem.meta?.featureNameEn ?? menuItem.featureNameEn) as string | undefined;
      }
    }

    resultBreadcrumb.push({
      icon,
      path: path || route.path,
      title: resolveMenuTitle(
        {
          title: title as string | undefined,
          name: routeName as string | undefined,
          featureName,
          featureNameEn,
        },
        { locale: locale.value, t: $t, te: $te },
      ),
    });
  }
  if (props.showHome) {
    resultBreadcrumb.unshift({
      icon: 'mdi:home-outline',
      isHome: true,
      path: '/',
    });
  }
  if (props.hideWhenOnlyOne && resultBreadcrumb.length === 1) {
    return [];
  }

  const currentKey = getTabKey(route);
  const tab = tabbarStore.getTabByKey(currentKey);
  const overrideTitle = tab?.meta?.newTabTitle;

  // 微前端详情深链：通配容器路由能匹配到，但菜单路由通常缺失，需用菜单树补全父链。
  const hasMicroName = !!(route.meta?.microName as string | undefined);
  const menuChain = hasMicroName
    ? findMenuChainByPath(accessStore.accessMenus, currentPath)
    : [];

  if (menuChain.length > 0) {
    const isDetail = !!overrideTitle;
    const chainBreadcrumbs: IBreadcrumb[] = menuChain.map((m, idx) => {
      const isLastMenu = idx === menuChain.length - 1;
      // 交互规则：
      // - “文件夹/父级”不应可点击（仅展示层级）
      // - 列表页本身也不需要点击
      // - 仅当在“详情页”时，允许点击“列表页”返回
      const clickable = isDetail && isLastMenu;

      return {
        icon: (m.meta as any)?.icon ?? (m.icon as any),
        path: clickable ? String(m.path ?? '') : undefined,
        title: resolveMenuTitle(
          {
            title: (m.meta as any)?.title ?? (m.title as any),
            name: (m.name as any) ?? undefined,
            // 优先使用菜单项上的 featureName/featureNameEn（由 generateMenus 生成）
            featureName: (m.featureName as string) ?? (m.meta as any)?.featureName ?? undefined,
            featureNameEn: (m.featureNameEn as string) ?? (m.meta as any)?.featureNameEn ?? undefined,
          },
          { locale: locale.value, t: $t, te: $te },
        ),
      };
    });

    // 详情页最后一级：优先使用 tab 的 newTabTitle（来自子应用传入的 title），避免污染 URL query。
    if (overrideTitle) {
      chainBreadcrumbs.push({
        path: route.fullPath,
        title: String(overrideTitle),
      });
    }

    const merged = props.showHome
      ? [
          {
            icon: 'mdi:home-outline',
            isHome: true,
            path: '/',
          } as IBreadcrumb,
          ...chainBreadcrumbs,
        ]
      : chainBreadcrumbs;

    if (props.hideWhenOnlyOne && merged.length === 1) {
      return [];
    }

    return merged;
  }

  // 非微前端详情页：最后一级展示标题以 tab 的 newTabTitle 为准（不污染 URL query）
  if (overrideTitle && resultBreadcrumb.length > 0) {
    resultBreadcrumb[resultBreadcrumb.length - 1]!.title =
      String(overrideTitle);
  }

  return resultBreadcrumb;
});

function handleSelect(path: string) {
  router.push(path);
}
</script>
<template>
  <VbenBreadcrumbView
    :breadcrumbs="breadcrumbs"
    :show-icon="showIcon"
    :style-type="type"
    class="ml-2"
    @select="handleSelect"
  />
</template>
