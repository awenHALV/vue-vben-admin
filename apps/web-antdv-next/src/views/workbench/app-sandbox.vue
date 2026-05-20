<script lang="ts" setup>
import type { MenuRecordRaw } from '@vben/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore, useTabbarStore } from '@vben/stores';

interface CustomApp {
  color: string;
  id: string;
  icon: string;
  menuKeys: string[];
  menus: CustomAppMenu[];
  name: string;
}

interface CustomAppMenu {
  children?: CustomAppMenu[];
  featureCode: string;
  featureIcon?: string;
  featureName: string;
  featureNameEn?: string;
  featureType: string;
  id: string;
  parentId: null | string;
  resourceCode?: string;
  routePath: string;
}

const CUSTOM_APPS_SESSION_KEY = 'workbench_custom_apps';
const CUSTOM_APP_SANDBOX_SESSION_KEY = 'workbench_app_sandbox';

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const tabbarStore = useTabbarStore();
const loading = ref(true);
const currentApp = ref<CustomApp>();

const appId = computed(() => String(route.query.appId ?? ''));

function parseSessionJson<T>(key: string): T | undefined {
  const value = sessionStorage.getItem(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return undefined;
  }
}

function findFirstMenuPath(menus: MenuRecordRaw[]): string {
  for (const menu of menus) {
    if (menu.path) {
      return menu.children?.length
        ? findFirstMenuPath(menu.children)
        : menu.path;
    }
  }

  return '/workbench';
}

function toMenuRecord(menu: CustomAppMenu): MenuRecordRaw {
  const children = (menu.children ?? []).map((child) => toMenuRecord(child));

  return {
    name: menu.featureName,
    featureName: menu.featureName,
    featureNameEn: menu.featureNameEn,
    icon: menu.featureIcon,
    path: menu.routePath || `/${menu.featureCode || menu.id}`,
    ...(children.length > 0 ? { children } : {}),
  };
}

function findSandboxApp(): CustomApp | undefined {
  const sandbox = parseSessionJson<{ app?: CustomApp; appId: string }>(
    CUSTOM_APP_SANDBOX_SESSION_KEY,
  );
  if (sandbox?.app && sandbox.appId === appId.value) {
    return sandbox.app;
  }

  // TODO: 后端接口就绪后，替换为根据 appId 读取应用绑定菜单。
  // return await getCustomAppConfigApi(appId.value);
  const apps = parseSessionJson<CustomApp[]>(CUSTOM_APPS_SESSION_KEY) ?? [];
  return apps.find((app) => app.id === appId.value);
}

onMounted(async () => {
  try {
    const app = findSandboxApp();
    currentApp.value = app;
    if (!app) {
      return;
    }

    sessionStorage.setItem(
      CUSTOM_APP_SANDBOX_SESSION_KEY,
      JSON.stringify({ appId: app.id, app }),
    );

    const sandboxMenus = app.menus.map((menu) => toMenuRecord(menu));
    accessStore.setAccessMenus(sandboxMenus);
    await tabbarStore.clearTabsForSandbox();
    await router.replace(findFirstMenuPath(sandboxMenus));
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Page>
    <div class="app-sandbox-state">
      <template v-if="loading">正在加载自定义应用...</template>
      <template v-else-if="currentApp">
        正在进入 {{ currentApp.name }}...
      </template>
      <template v-else>未找到自定义应用配置</template>
    </div>
  </Page>
</template>

<style scoped>
.app-sandbox-state {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
}
</style>
