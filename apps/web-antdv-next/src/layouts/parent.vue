<script lang="ts" setup>
import { RouterView } from 'vue-router';

/**
 * 嵌套菜单目录节点专用：仅承载子路由，避免与 Root 的 BasicLayout 重复套娃。
 * 顶层动态路由仍使用 BasicLayout（随后由 generateAccessible 去掉 component）。
 */
defineOptions({ name: 'ParentLayout' });
</script>

<template>
  <RouterView />
</template>
