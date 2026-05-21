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

  // =========================================================================
  // 1. 常规路由过滤与清洗阶段 (Standard Route Filtering)
  // =========================================================================
  const filteredMatched = matched.filter((m) => {
    return (
      m.meta?.title && m.name !== 'Root' && !m.path.startsWith('/__group__')
    );
  });
  const resultBreadcrumb: IBreadcrumb[] = [];

  for (const match of filteredMatched) {
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

    let featureName = metaFeatureName as string | undefined;
    let featureNameEn = metaFeatureNameEn as string | undefined;

    if (!featureName && accessStore.accessMenus.length > 0) {
      const menuItem = findMenuByPath(
        accessStore.accessMenus as MenuRecordLike[],
        path,
      );
      if (menuItem) {
        featureName = (menuItem.meta?.featureName ?? menuItem.featureName) as
          | string
          | undefined;
        featureNameEn = (menuItem.meta?.featureNameEn ??
          menuItem.featureNameEn) as string | undefined;
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

  // =========================================================================
  // 2. 微前端深度链树解析与「首帧防闪烁」对齐阶段
  // =========================================================================
  const currentKey = getTabKey(route);
  const tab = tabbarStore.getTabByKey(currentKey);
  const overrideTitle = tab?.meta?.newTabTitle;

  const hasMicroName = !!(route.meta?.microName as string | undefined);
  const menuChain = hasMicroName
    ? findMenuChainByPath(accessStore.accessMenus, currentPath)
    : [];

  if (menuChain.length > 0) {
    const lastMenuItem = menuChain[menuChain.length - 1];

    // 1. 获取最后一级静态菜单的原始多语言配置字段（Key 或 原始明文）
    const lastMenuRawName = (lastMenuItem?.meta?.title ??
      lastMenuItem?.title ??
      lastMenuItem?.name) as string | undefined;

    // 🌟【降级拦截】提前模拟计算最后一级菜单在“当前激活语种”下的绝对翻译中文字符串
    // 强制指定 locale: 'zh-CN' 和 'en-US'，用于在后面拦截切换语言时 Tab 里未及时同步的残余标题
    const fallbackTitleZh =
      lastMenuRawName && $te(lastMenuRawName)
        ? $t(lastMenuRawName, {}, { locale: 'zh-CN' })
        : undefined;
    const fallbackTitleEn =
      lastMenuRawName && $te(lastMenuRawName)
        ? $t(lastMenuRawName, {}, { locale: 'en-US' })
        : undefined;

    // 2. 遍历菜单链，使用框架最权威的 resolveMenuTitle 组装面包屑实体
    const chainBreadcrumbs: IBreadcrumb[] = menuChain.map((m, idx) => {
      const isLastMenu = idx === menuChain.length - 1;
      return {
        icon: (m.meta as any)?.icon ?? (m.icon as any),
        path: undefined, // 占位，clickable 状态由下方 isDetail 判定后二次改写，防止破坏首帧计算
        title: resolveMenuTitle(
          {
            title: (m.meta as any)?.title ?? (m.title as any),
            name: (m.name as any) ?? undefined,
            featureName:
              (m.featureName as string) ??
              (m.meta as any)?.featureName ??
              undefined,
            featureNameEn:
              (m.featureNameEn as string) ??
              (m.meta as any)?.featureNameEn ??
              undefined,
          },
          { locale: locale.value, t: $t, te: $te },
        ),
      };
    });

    // 3. 获取刚刚通过标准翻译引擎翻译出来的“当前语种下面包屑最末级”的真实显示文字
    const currentTranslatedTitle =
      chainBreadcrumbs[chainBreadcrumbs.length - 1]?.title;

    // 4. ✨ 【终极天网式多语言全等判定】
    // 只要子应用上抛的 overrideTitle 满足以下任意一项，即判定为“主页”，杜绝多渲染第4层：
    //   - overrideTitle 为空（首帧状态）
    //   - 与菜单原始 Key / 名字字符串强相等
    //   - 与当前多语言环境完全翻译出来的最末级标准名称（英文名或中文名）强相等
    //   - 强等于强制提取出的业务中文名（防止切英文时，Tab内部缓存依旧残留中文导致的错位）
    //   - 强等于强制提取出的业务英文名（防止切中文时，Tab内部缓存依旧残留英文导致的错位）
    const isSameTitle =
      !overrideTitle ||
      String(overrideTitle) === String(lastMenuRawName) ||
      String(overrideTitle) === String(currentTranslatedTitle) ||
      (fallbackTitleZh && String(overrideTitle) === String(fallbackTitleZh)) ||
      (fallbackTitleEn && String(overrideTitle) === String(fallbackTitleEn));

    const isDetail = !isSameTitle; // 只有不等于主页的任何一种多语言形态，才属于真正的详情页

    // 5. 修正最后一级的点击响应行为
    if (chainBreadcrumbs.length > 0) {
      const lastBreadcrumb = chainBreadcrumbs[chainBreadcrumbs.length - 1]!;
      lastBreadcrumb.path = isDetail
        ? String(lastMenuItem?.path ?? '')
        : undefined;
    }

    // 6. 如果是真正的内嵌详情页，且动态标题不为空，则追加最后一层详情面包屑
    if (isDetail && overrideTitle) {
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

  // =========================================================================
  // 3. 非微前端常规路由覆写兜底
  // =========================================================================
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
