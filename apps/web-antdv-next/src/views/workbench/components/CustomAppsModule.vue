<script lang="ts" setup>
import type { BackendMenuItem } from '#/api/core/menu';
import type {
  WorkbenchAppConfigApiItem,
  WorkbenchAppConfigDetailApiItem,
  WorkbenchAppFeatureItem,
} from '#/api/workbench';

import { h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { App, Button, Card, Drawer, Input, message, Tree } from 'antdv-next';

import { getMineFeaturesRawApi } from '#/api/core/menu';
import {
  createWorkbenchAppConfigApi,
  deleteWorkbenchAppConfigApi,
  getWorkbenchAppConfigDetailApi,
  getWorkbenchAppConfigListApi,
} from '#/api/workbench';
import { $t } from '#/locales';

// ==================== 自定义应用 ====================
// 工作台自定义应用配置；正式接后端后由 appId 对应数据库配置。
interface CustomApp {
  color: string;
  id: string;
  icon: string;
  // Tree 回显/统计用 key 集合，不作为最终菜单渲染来源。
  menuKeys: string[];
  // 应用绑定的菜单快照，沙箱侧栏按它渲染并过滤路由。
  menus: CustomAppMenu[];
  name: string;
}

// 保存必要菜单字段与完整 children，确保沙箱刷新后仍能恢复菜单树。
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

// Ant Design Tree 使用的展示节点，key 必须全树唯一。
interface MenuTreeNode {
  children?: MenuTreeNode[];
  icon?: string;
  key: string;
  title: string;
}
const { modal } = App.useApp();
// 当前浏览器页签的沙箱上下文；每个 window.open 页签各自独立。
const CUSTOM_APP_SANDBOX_SESSION_KEY = 'workbench_app_sandbox';
const router = useRouter();

const customApps = ref<CustomApp[]>([]);

const appConfigVisible = ref(false);
const appForm = reactive({
  name: '',
  icon: 'lucide:layout-grid',
  color: 'blue',
  selectedMenus: [] as string[],
});
const appFormErrors = reactive({
  name: '',
});

const colorOptions = [
  {
    value: 'blue',
    label: $t('workbench.customApps.colors.blue'),
    color: '#1677ff',
    gradient: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
  },
  {
    value: 'green',
    label: $t('workbench.customApps.colors.green'),
    color: '#52c41a',
    gradient: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
  },
  {
    value: 'orange',
    label: $t('workbench.customApps.colors.orange'),
    color: '#faad14',
    gradient: 'linear-gradient(135deg, #fa8c16 0%, #ffc53d 100%)',
  },
  {
    value: 'purple',
    label: $t('workbench.customApps.colors.purple'),
    color: '#722ed1',
    gradient: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
  },
  {
    value: 'red',
    label: $t('workbench.customApps.colors.red'),
    color: '#f5222d',
    gradient: 'linear-gradient(135deg, #f5222d 0%, #ff7875 100%)',
  },
  {
    value: 'cyan',
    label: $t('workbench.customApps.colors.cyan'),
    color: '#13c2c2',
    gradient: 'linear-gradient(135deg, #13c2c2 0%, #5cdbd3 100%)',
  },
];

const availableMenus = ref<MenuTreeNode[]>([]);

const availableIcons = [
  { icon: 'lucide:zap' },
  { icon: 'lucide:plug' },
  { icon: 'lucide:battery-charging' },
  { icon: 'lucide:sun' },
  { icon: 'lucide:cloud-sun' },
  { icon: 'lucide:wind' },
  { icon: 'lucide:flame' },
  { icon: 'lucide:thermometer' },
  { icon: 'lucide:trending-up' },
  { icon: 'lucide:bar-chart-3' },
  { icon: 'lucide:line-chart' },
  { icon: 'lucide:pie-chart' },
  { icon: 'lucide:activity' },
  { icon: 'lucide:calculator' },
  { icon: 'lucide:clipboard-list' },
  { icon: 'lucide:file-text' },
  { icon: 'lucide:bell' },
  { icon: 'lucide:settings' },
  { icon: 'lucide:sliders' },
  { icon: 'lucide:filter' },
  { icon: 'lucide:building-2' },
  { icon: 'lucide:home' },
  { icon: 'lucide:factory' },
  { icon: 'lucide:server' },
  { icon: 'lucide:cpu' },
  { icon: 'lucide:star' },
  { icon: 'lucide:heart' },
  { icon: 'lucide:bookmark' },
  { icon: 'lucide:target' },
  { icon: 'lucide:rocket' },
  { icon: 'lucide:shield' },
  { icon: 'lucide:globe' },
];

function openAppConfig() {
  appForm.name = '';
  appForm.icon = 'lucide:layout-grid';
  appForm.color = 'blue';
  appForm.selectedMenus = [];
  appFormErrors.name = '';
  appConfigVisible.value = true;
  checkedKeys.value = [];
}

// 输入后清理名称错误态，提交时仍会完整校验。
function handleAppNameChange() {
  if (appForm.name.trim()) {
    appFormErrors.name = '';
  }
}

// 抽屉提交校验：名称走表单错误态，菜单未选使用 toast 提示。
function validateAppConfig() {
  appFormErrors.name = '';

  if (!appForm.name.trim()) {
    appFormErrors.name = $t('workbench.customApps.validation.appNameRequired');
  } else if (appForm.name.length > 20) {
    appFormErrors.name = $t('workbench.customApps.validation.appNameMaxLength');
  }

  if (appForm.selectedMenus.length === 0) {
    message.error($t('workbench.customApps.validation.menuRequired'));
  }

  return !appFormErrors.name && appForm.selectedMenus.length > 0;
}

// 判断一个路径段数组是否已经包含父级前缀，用于识别后端返回的绝对路径。
function pathSegmentsStartWithParent(
  pathSegments: string[],
  parentSegments: string[],
) {
  if (pathSegments.length < parentSegments.length) {
    return false;
  }

  return parentSegments.every(
    (seg, index) => seg.toLowerCase() === pathSegments[index]?.toLowerCase(),
  );
}

/**
 * 将后端可能返回的相对 routePath 拼成绝对路径。
 * 例如父级 /vpp/informationDisclosure + 子级 /electricity-market
 * 会保存成 /vpp/informationDisclosure/electricity-market。
 */
function resolveMenuAbsoluteRoutePath(
  routePath: string | undefined,
  parentAbsoluteRoutePath?: string,
) {
  const trimmed = String(routePath ?? '').trim();
  if (!trimmed) {
    return parentAbsoluteRoutePath ?? '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const raw = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (
    !parentAbsoluteRoutePath ||
    /^https?:\/\//i.test(parentAbsoluteRoutePath)
  ) {
    return raw;
  }

  const parentNorm = parentAbsoluteRoutePath.replace(/\/+$/, '') || '/';
  if (parentNorm === '/') {
    return raw;
  }

  const rawSegments = raw.split('/').filter(Boolean);
  const parentSegments = parentNorm.split('/').filter(Boolean);
  if (pathSegmentsStartWithParent(rawSegments, parentSegments)) {
    return `/${rawSegments.join('/')}`;
  }

  return `/${[...parentSegments, ...rawSegments].join('/')}`;
}

// 将后端菜单节点转换为自定义应用菜单快照，并递归保存全部 MENU children。
function toCustomAppMenu(
  item: BackendMenuItem,
  parentAbsoluteRoutePath?: string,
): CustomAppMenu {
  const absoluteRoutePath = resolveMenuAbsoluteRoutePath(
    item.routePath,
    parentAbsoluteRoutePath,
  );
  const children = (item.children ?? [])
    .filter(Boolean)
    .filter((child) => isMenuFeature(child))
    .map((child) => toCustomAppMenu(child, absoluteRoutePath));

  return {
    id: String(item.id),
    featureType: String(item.featureType ?? ''),
    featureCode: String(item.featureCode ?? ''),
    featureName: String(item.featureName ?? ''),
    featureNameEn: item.featureNameEn || undefined,
    featureIcon: item.featureIcon || undefined,
    routePath: absoluteRoutePath,
    parentId:
      item.parentId === null || item.parentId === undefined
        ? null
        : String(item.parentId),
    resourceCode: item.resourceCode || undefined,
    ...(children.length > 0 ? { children } : {}),
  };
}

// 收集最终菜单快照里的所有 key，供后续回显/统计使用。
function collectMenuKeys(items: CustomAppMenu[], keys = new Set<string>()) {
  for (const item of items) {
    const routePath = String(item.routePath ?? '').trim();
    keys.add(routePath || item.id || item.featureCode);
    collectMenuKeys(item.children ?? [], keys);
  }

  return keys;
}

function normalizeBackendMenuItem(
  item: WorkbenchAppFeatureItem,
): BackendMenuItem {
  return {
    children: Array.isArray(item.children)
      ? item.children.map((child) => normalizeBackendMenuItem(child))
      : [],
    featureCode: String(item.featureCode ?? ''),
    featureIcon: item.featureIcon || undefined,
    featureName: String(item.featureName ?? ''),
    featureNameEn: item.featureNameEn || undefined,
    featureType: String(item.featureType ?? ''),
    id: String(item.id),
    parentId:
      item.parentId === null || item.parentId === undefined
        ? null
        : String(item.parentId),
    resourceCode: item.resourceCode || undefined,
    routePath: String(item.routePath ?? ''),
    sort: item.sort,
  };
}

function mapAppConfigToCustomApp(item: WorkbenchAppConfigApiItem): CustomApp {
  return {
    id: String(item.id),
    name: item.appName || '',
    icon: item.appIcon || 'lucide:layout-grid',
    color: item.appColor || 'blue',
    menuKeys: [],
    menus: [],
  };
}

function mapAppConfigDetailToCustomApp(
  detail: WorkbenchAppConfigDetailApiItem,
): CustomApp {
  const menus = (detail.features ?? [])
    .filter(Boolean)
    .filter((item) => isMenuFeature(item))
    .map((item) => toCustomAppMenu(normalizeBackendMenuItem(item)));
  return {
    ...mapAppConfigToCustomApp(detail),
    menuKeys: detail.featureIds
      ? detail.featureIds.split(',').filter(Boolean)
      : [...collectMenuKeys(menus)],
    menus,
  };
}

// 保存一个新的自定义应用配置。
async function loadCustomApps() {
  try {
    const apps = await getWorkbenchAppConfigListApi();
    customApps.value = apps.map((item) => mapAppConfigToCustomApp(item));
  } catch (error) {
    console.error('加载自定义应用配置失败:', error);
    customApps.value = [];
  }
}

// 定义一个变量存储半选状态
const halfCheckedKeys = ref<(number | string)[]>([]);
const checkedKeys = ref<(number | string)[]>([]);
function updateCheckedKeys(keys: (number | string)[], infos: any) {
  checkedKeys.value = keys.map(String);
  halfCheckedKeys.value = infos.halfCheckedKeys;
  appForm.selectedMenus = keys.map(String);
}

async function saveAppConfig() {
  if (!validateAppConfig()) return;
  try {
    const allKeys = [...checkedKeys.value, ...halfCheckedKeys.value];
    await createWorkbenchAppConfigApi({
      appColor: appForm.color,
      appIcon: appForm.icon,
      appName: appForm.name.trim(),
      featureIds: allKeys.join(','),
    });
    appConfigVisible.value = false;
    await loadCustomApps();
  } catch (error) {
    console.error('保存自定义应用配置失败:', error);
  }
}

/**
 * 打开沙箱页签。
 * workbench_app_sandbox 只表示当前打开的应用上下文；
 * 新 window 会复制一份 sessionStorage，之后与原工作台窗口互不影响。
 */
async function openAppSandbox(app: CustomApp) {
  let appForSandbox = app;
  try {
    const detail = await getWorkbenchAppConfigDetailApi(app.id);
    appForSandbox = mapAppConfigDetailToCustomApp(detail);
  } catch (error) {
    console.error('加载自定义应用详情失败:', error);
  }

  sessionStorage.setItem(
    CUSTOM_APP_SANDBOX_SESSION_KEY,
    JSON.stringify({
      appId: appForSandbox.id,
      app: appForSandbox,
    }),
  );

  const { href } = router.resolve({
    path: '/workbench/app-sandbox',
    query: { appId: appForSandbox.id },
  });
  window.open(href, '_blank');
}

function deleteApp(appId: string) {
  modal.confirm({
    title: $t('workbench.customApps.deleteConfirm.title'),
    content: $t('workbench.customApps.deleteConfirm.content'),
    okText: $t('workbench.customApps.deleteConfirm.okText'),
    cancelText: $t('workbench.customApps.deleteConfirm.cancelText'),
    icon: h(
      'span',
      {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          marginRight: '12px',
        },
      },
      [
        h(IconifyIcon, {
          icon: 'ant-design:exclamation-circle-filled',
          style: { color: '#FF4D4F', fontSize: '22px' },
        }),
      ],
    ),
    onOk: async () => {
      await deleteWorkbenchAppConfigApi(appId);
      await loadCustomApps();
    },
  });
}

function getIconColor(color: string) {
  const colorMap: Record<string, string> = {
    blue: '#1890ff',
    green: '#52c41a',
    orange: '#fa8c16',
    purple: '#722ed1',
    red: '#f5222d',
    cyan: '#13c2c2',
  };
  return colorMap[color] || '#1890ff';
}

function isMenuFeature(item: BackendMenuItem) {
  return String(item.featureType ?? '').toUpperCase() === 'MENU';
}

// Tree key 优先用后端 id，避免多个菜单 routePath 相同导致 antd Tree key 重复。
function getMenuNodeKey(item: BackendMenuItem, absoluteRoutePath?: string) {
  return String(
    item.id ||
      item.featureCode ||
      absoluteRoutePath ||
      item.routePath ||
      `${item.parentId || 'root'}-${item.featureName}`,
  );
}

// 将完整后端菜单转换为抽屉 Tree 数据，仅展示 MENU 类型。
function mapMenuTree(
  items: BackendMenuItem[],
  parentAbsoluteRoutePath?: string,
): MenuTreeNode[] {
  return items
    .filter((item) => isMenuFeature(item))
    .map((item) => {
      const absoluteRoutePath = resolveMenuAbsoluteRoutePath(
        item.routePath,
        parentAbsoluteRoutePath,
      );
      const children = mapMenuTree(
        (item.children ?? []).filter(Boolean),
        absoluteRoutePath,
      );
      return {
        key: getMenuNodeKey(item, absoluteRoutePath),
        title: item.featureName,
        icon: item.featureIcon || undefined,
        ...(children.length > 0 ? { children } : {}),
      };
    });
}

// 拉取当前用户可配置菜单；保留原始树用于保存时裁剪。
async function loadAvailableMenus() {
  try {
    const rawMenus = await getMineFeaturesRawApi();
    availableMenus.value = mapMenuTree(rawMenus);
  } catch (error) {
    console.error('加载菜单失败:', error);
    availableMenus.value = [];
  }
}
// ==================== 生命周期 ====================
onMounted(() => {
  void loadCustomApps();
  void loadAvailableMenus();
});
</script>

<template>
  <!-- eslint-disable vue/max-attributes-per-line -->
  <!-- 区域B：自定义应用入口 -->
  <Card v-if="customApps.length > 0" class="app-card">
    <template #title>
      <div class="card-title">
        <span>{{ $t('workbench.customApps.title') }}</span>
      </div>
    </template>
    <template #extra>
      <Button type="primary" size="small" @click="openAppConfig">
        <IconifyIcon icon="lucide:settings" />
        {{ $t('workbench.customApps.config') }}
      </Button>
    </template>

    <!-- 应用列表 -->
    <div class="app-grid">
      <div
        v-for="app in customApps"
        :key="app.id"
        class="app-item"
        :class="`app-color-${app.color || 'blue'}`"
        :title="app.name"
        @click="openAppSandbox(app)"
      >
        <div class="app-icon-wrapper">
          <IconifyIcon :icon="app.icon" class="app-icon" />
        </div>

        <div class="app-name">
          {{ app.name }}
        </div>

        <div class="app-delete" @click.stop="deleteApp(app.id)">
          <IconifyIcon icon="lucide:x" />
        </div>
        <div class="app-shine"></div>
      </div>
    </div>
  </Card>

  <!-- 应用为空时的紧凑提示 -->
  <div v-else class="app-empty-compact">
    <div class="empty-content">
      <IconifyIcon icon="lucide:layout-grid" class="empty-icon" />
      <span class="empty-text">{{ $t('workbench.customApps.emptyText') }}</span>
      <Button type="primary" size="small" @click="openAppConfig">
        <IconifyIcon icon="lucide:plus" />
        {{ $t('workbench.customApps.add') }}
      </Button>
    </div>
  </div>

  <!-- 应用配置抽屉 -->
  <Drawer
    v-model:open="appConfigVisible"
    :title="$t('workbench.customApps.drawerTitle')"
    width="600px"
    :mask-closable="false"
    :closable="{ placement: 'end' }"
    :body-style="{
      padding: '16px 20px',
      height: 'calc(100vh - 110px)',
      overflowY: 'auto',
    }"
  >
    <div class="app-config-form">
      <!-- 第一行：应用名称 + 主题颜色 -->
      <div class="form-row">
        <div class="form-item form-item-flex">
          <label class="form-label">
            {{ $t('workbench.customApps.appName') }}
            <span class="required">*</span>
          </label>
          <Input
            v-model:value="appForm.name"
            :placeholder="$t('workbench.customApps.appNamePlaceholder')"
            :maxlength="20"
            :status="appFormErrors.name ? 'error' : undefined"
            @change="handleAppNameChange"
            @input="handleAppNameChange"
          />
          <div v-if="appFormErrors.name" class="form-error">
            {{ appFormErrors.name }}
          </div>
        </div>
        <div class="form-item form-item-flex">
          <label class="form-label">
            {{ $t('workbench.customApps.themeColor') }}
          </label>
          <div class="color-selector compact">
            <div
              v-for="color in colorOptions"
              :key="color.value"
              class="color-item"
              :class="[{ active: appForm.color === color.value }]"
              :style="{ background: color.color }"
              @click="appForm.color = color.value"
            >
              <IconifyIcon
                v-if="appForm.color === color.value"
                icon="lucide:check"
                class="color-check"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 第二行：应用图标 -->
      <div class="form-item">
        <label class="form-label">
          {{ $t('workbench.customApps.appIcon') }}
        </label>
        <div class="compact icon-selector">
          <div
            v-for="item in availableIcons"
            :key="item.icon"
            class="icon-item"
            :class="[{ active: appForm.icon === item.icon }]"
            :style="
              appForm.color
                ? { '--icon-color': getIconColor(appForm.color) }
                : {}
            "
            @click="appForm.icon = item.icon"
          >
            <IconifyIcon :icon="item.icon" />
          </div>
        </div>
      </div>

      <!-- 第三行：选择菜单 -->
      <div class="form-item">
        <label class="form-label">
          {{ $t('workbench.customApps.selectMenu') }}
          <span class="required">*</span>
        </label>
        <div class="menu-tree-wrapper">
          <Tree
            :checked-keys="checkedKeys"
            :tree-data="availableMenus"
            checkable
            :selectable="false"
            :default-expand-all="true"
            @check="(keys, infos) => updateCheckedKeys(keys, infos)"
          >
            <template #title="{ title, icon }">
              <span class="tree-node-title">
                <IconifyIcon v-if="icon" :icon="icon" class="tree-node-icon" />
                {{ title }}
              </span>
            </template>
          </Tree>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button @click="appConfigVisible = false">
          {{ $t('workbench.customApps.cancel') }}
        </Button>
        <Button type="primary" @click="saveAppConfig">
          {{ $t('workbench.customApps.save') }}
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
/* 应用卡片 - 紧凑样式 */
.app-card {
  margin-bottom: 16px;
}

.app-card :deep(.ant-card-head) {
  min-height: 44px;
  padding: 8px 16px;
  font-size: 14px;
}

.app-card :deep(.ant-card-body) {
  padding: 12px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: hsl(var(--background));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.app-item .app-name {
  /* 核心核心：打破原有的单行限制，允许换行 */
  white-space: normal !important; /* 【关键修改】强制覆盖可能存在的 nowrap，允许文本换行 */
  /* 核心核心：限制 2 行文本，超出显示省略号 (...) */
  display: -webkit-box;
  -webkit-line-clamp: 2; /* 限制最多显示 2 行 */
  -webkit-box-orient: vertical; /* 设定伸缩盒子的子元素排列方式 */
  overflow: hidden; /* 隐藏超出两行的文字 */
  text-overflow: ellipsis; /* 溢出时显示三个点 */
  word-break: break-all; /* 确保长英文/数字能在边界自动折行，防止撑破卡片 */

  /* 辅助排版与防错位 */
  width: 100%; /* 撑满父容器宽度 */
  text-align: center; /* 文字居中 */
  font-size: 13px; /* 可以根据实际视觉微调字号 */
  line-height: 1.4; /* 规范行高 */

  /* 【核心防错位】固定 2 行的高度空间 
     1.4(line-height) * 2(行数) = 2.8em
     这样不管名字是 1 行还是 2 行，占用的高度都完全一致，卡片绝对对齐 */
  min-height: 2.8em;
  max-height: 2.8em;
}

.app-item:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
/* 暗黑模式下悬浮背景色 */
.dark .app-item:hover {
  background-color: #292c33;
}
.app-shine {
  display: none;
}

/* 应用图标样式 - 不同颜色主题 */
.app-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.app-item:hover .app-icon-wrapper {
  transform: scale(1.05);
}

.app-icon {
  font-size: 20px;
  color: white;
}

/* 颜色主题 - 纯色方案 */
.app-color-blue .app-icon-wrapper {
  background: #1677ff;
}

.app-color-green .app-icon-wrapper {
  background: #52c41a;
}

.app-color-orange .app-icon-wrapper {
  background: #faad14;
}

.app-color-purple .app-icon-wrapper {
  background: #722ed1;
}

.app-color-red .app-icon-wrapper {
  background: #f5222d;
}

.app-color-cyan .app-icon-wrapper {
  background: #13c2c2;
}

.app-name {
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--foreground));
  text-align: center;
  transition: color 0.3s;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.app-item:hover .app-name {
  color: hsl(var(--primary));
}

.app-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 1px 4px;
  background: hsl(var(--primary) / 0.1);
  border-radius: 8px;
  font-size: 9px;
  color: hsl(var(--primary));
  font-weight: 600;
}

.app-delete {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 77, 79, 0.9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  opacity: 0;
  transition: all 0.3s;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(255, 77, 79, 0.3);
}

.app-delete:hover {
  background: #ff4d4f;
  transform: scale(1.1);
}

.app-item:hover .app-delete {
  opacity: 1;
}

.app-empty-compact {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: hsl(var(--card));
  border-radius: 8px;
  border: 1px dashed hsl(var(--border));
}

.empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-icon {
  font-size: 16px;
  color: hsl(var(--primary));
}

.empty-text {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

/* 应用配置表单 */
.app-config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item-flex {
  flex: 1;
  min-width: 0;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.required {
  color: #ff4d4f;
}

.form-error {
  margin-top: -4px;
  font-size: 12px;
  line-height: 1.4;
  color: #ff4d4f;
}

/* 颜色选择器 */
.color-selector {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.color-selector.compact {
  gap: 4px;
}

.color-item {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  flex-shrink: 0;
}

.color-item:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.color-item.active {
  box-shadow:
    0 0 0 2px hsl(var(--background)),
    0 0 0 3px hsl(var(--primary));
  transform: scale(1.05);
}

.color-check {
  color: white;
  font-size: 14px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* 图标选择器 */
.icon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  padding: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.icon-selector.compact {
  max-height: 240px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: hsl(var(--background));
  cursor: pointer;
  transition: all 0.2s;
}

.icon-item:hover {
  background: hsl(var(--accent));
  transform: translateY(-1px);
}

.icon-item.active {
  border-color: hsl(var(--primary));
  background: hsl(var(--primary) / 0.1);
  box-shadow: 0 2px 8px hsl(var(--primary) / 0.15);
}

.icon-item svg {
  font-size: 20px;
  color: hsl(var(--muted-foreground));
  transition: color 0.2s;
}

.icon-item.active svg,
.icon-item:hover svg {
  color: var(--icon-color, #1890ff);
}

.icon-label {
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.icon-item.active .icon-label {
  color: hsl(var(--primary));
  font-weight: 500;
}

/* 菜单树选择器 */
.menu-tree-wrapper {
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
  background: hsl(var(--card));
  max-height: calc(100vh - 500px);
  overflow-y: auto;
}

.menu-tree-wrapper :deep(.ant-tree) {
  background: transparent;
}

.menu-tree-wrapper :deep(.ant-tree-treenode) {
  padding: 4px 0;
}

.tree-node-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.tree-node-icon {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
}
</style>
