<script lang="ts" setup>
import { computed } from 'vue';

import { Fallback } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

defineOptions({ name: 'Fallback404Demo' });

const accessStore = useAccessStore();

/**
 * 递归找到菜单树中第一个叶子节点的 path（没有 children 的菜单项）
 */
function findFirstLeafPath(
  menus: typeof accessStore.accessMenus,
): string | undefined {
  for (const menu of menus) {
    if (!menu.children || menu.children.length === 0) {
      return menu.path;
    }
    const child = findFirstLeafPath(menu.children);
    if (child) return child;
  }
  return undefined;
}

/** 优先跳到菜单第一个叶子路由，找不到则回退到 '/' */
const homePath = computed(
  () => findFirstLeafPath(accessStore.accessMenus) ?? '/',
);
</script>

<template>
  <Fallback :home-path="homePath" status="404" />
</template>
