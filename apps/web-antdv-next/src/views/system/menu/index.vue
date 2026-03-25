<script lang="ts" setup>
import type { BackendMenuItem, MenuPageParams } from '#/api/core/menu';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus, Trash2 } from '@vben/icons';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message, Modal, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteFeatureApi, getRawMenusApi } from '#/api/core/menu';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';

import AddOrUpdate from './AddOrUpdate.vue';

defineOptions({ name: 'SystemMenu' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();

// ─── 状态 ───────────────────────────────────────────────────────────────
const selectedRowIds = ref<(number | string)[]>([]);
const inputKeyword = ref('');

// ─── 新增/编辑弹窗 ───────────────────────────────────────────────────
const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);

function openAddModal(parent?: BackendMenuItem) {
  addOrUpdateRef.value?.open(parent);
}

function openEditModal(record: BackendMenuItem) {
  addOrUpdateRef.value?.open(undefined, record);
}

const FEATURE_TYPE_I18N_KEY: Record<string, string> = {
  MENU: 'menu.type.menu',
  BUTTON: 'menu.type.button',
};

function featureTypeLabel(
  featureType: null | string | undefined,
  t: (key: string) => string,
): string {
  const ft = String(featureType ?? '')
    .toUpperCase()
    .trim();
  const i18nKey = FEATURE_TYPE_I18N_KEY[ft];
  if (i18nKey) {
    return t(i18nKey);
  }
  // 未知类型：原样显示或占位符，避免返回 undefined
  return featureType ? String(featureType) : '-';
}

const [Grid, gridApi] = useVbenVxeGrid<BackendMenuItem>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: {
      isHover: true,
      keyField: 'id',
    },
    checkboxConfig: {
      highlight: true,
      range: false,
    },
    treeConfig: {
      childrenField: 'children',
      rowField: 'id',
      transform: false,
      // iconOpen: 'vxe-icon-caret-right',
      // iconClose: 'vxe-icon-caret-left',
    },
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any, mergedForm: any) => {
          const params: MenuPageParams = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
          };
          if (mergedForm && typeof mergedForm === 'object') {
            Object.assign(params, mergedForm);
          }
          try {
            const res = await getRawMenusApi(params);
            return {
              records: res.items ?? [],
              total: res.total ?? 0,
            };
          } catch {
            message.error($t('menu.message.fetchFailed'));
            return {
              records: [],
              total: 0,
            };
          }
        },
      },
      response: {
        list: 'records',
        result: 'records',
        total: 'total',
      },
    },
    columns: [
      {
        type: 'checkbox',
        width: 46,
        align: 'center',
      },
      {
        field: 'featureName',
        title: $t('menu.list.featureName'),
        minWidth: 180,
        treeNode: true,
      },
      {
        field: 'featureNameEn',
        title: $t('menu.list.featureNameEn'),
        minWidth: 180,
        showOverflow: 'tooltip',
      },
      {
        field: 'featureCode',
        title: $t('menu.list.featureCode'),
        minWidth: 140,
        showOverflow: 'tooltip',
      },
      {
        field: 'featureType',
        title: $t('menu.list.featureType'),
        width: 100,
        align: 'center',
        formatter: ({ cellValue }: { cellValue?: null | string }) =>
          featureTypeLabel(cellValue, $t),
      },
      {
        field: 'featureIcon',
        title: $t('menu.list.featureIcon'),
        width: 100,
        align: 'center',
      },
      {
        field: 'sort',
        title: $t('menu.list.sort'),
        width: 90,
        align: 'center',
      },
      {
        field: 'routePath',
        title: $t('menu.list.routePath'),
        minWidth: 160,
        showOverflow: 'tooltip',
      },
      {
        title: $t('menu.list.action'),
        width: 220,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
  gridEvents: {
    checkboxAll: () => {
      const records = (gridApi.grid as any).getCheckboxRecords?.() ?? [];
      selectedRowIds.value = records
        .map((item: BackendMenuItem) => item.id)
        .filter((id) => id !== null && id !== undefined);
    },
    checkboxChange: () => {
      const records = (gridApi.grid as any).getCheckboxRecords?.() ?? [];
      selectedRowIds.value = records
        .map((item: BackendMenuItem) => item.id)
        .filter((id) => id !== null && id !== undefined);
    },
  },
});

// ─── 搜索 / 重置 ─────────────────────────────────────────────────────────
function handleSearch() {
  void gridApi.reload(getSearchPayload());
}

function handleReset() {
  inputKeyword.value = '';
  void gridApi.reload();
}

// ─── 行操作 ──────────────────────────────────────────────────────────────
function handleAdd(parent?: BackendMenuItem) {
  openAddModal(parent);
}

function handleEdit(record: BackendMenuItem) {
  openEditModal(record);
}

function handleDelete(record: BackendMenuItem) {
  const confirmModal = Modal.confirm({
    title: $t('menu.action.delete'),
    content: $t('menu.message.deleteConfirm', [record.featureName]),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onCancel: () => {
      confirmModal.destroy();
    },
    onOk: async () => {
      await deleteFeatureApi(record.id);
      message.success($t('menu.message.deleted', { 0: record.featureName }));
      await handleDeleteSuccess(record);
      confirmModal.destroy();
    },
  });
}

function handleBatchDelete() {
  if (selectedRowIds.value.length === 0) {
    message.warning($t('menu.message.selectFirst'));
    return;
  }
  const confirmModal = Modal.confirm({
    title: $t('menu.action.batchDelete'),
    content: $t('menu.message.batchDeleteConfirm', {
      0: selectedRowIds.value.length,
    }),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onCancel: () => {
      confirmModal.destroy();
    },
    onOk: async () => {
      await deleteFeatureApi(selectedRowIds.value);
      message.success($t('menu.message.batchDeleteSuccess'));
      selectedRowIds.value = [];
      await handleBatchDeleteSuccess();
      confirmModal.destroy();
    },
  });
}

interface AccessMenuItem {
  children?: AccessMenuItem[];
  path?: string;
}

/**
 * 获取菜单树中的第一个有效路径
 * @param menus 菜单项列表
 * @returns 第一个有效的内部路径，若未找到则返回空字符串
 */
function getFirstMenuPath(menus: AccessMenuItem[]): string {
  for (const menu of menus) {
    // 优先递归查找子菜单中的有效路径
    const children = menu.children ?? [];
    if (children.length > 0) {
      const childPath = getFirstMenuPath(children);
      if (childPath) return childPath;
    }
    // 检查当前菜单项是否包含有效的内部路径
    const path = menu.path ?? '';
    if (path && !path.startsWith('http')) {
      return path;
    }
  }
  return '';
}

/**
 * 递归判断菜单列表中是否存在指定路径的菜单项
 * @param menus - 菜单项列表
 * @param targetPath - 目标路径
 * @returns 是否存在指定路径的菜单项
 */
function hasMenuPath(menus: AccessMenuItem[], targetPath: string): boolean {
  for (const menu of menus) {
    if (menu.path === targetPath) return true;
    const children = menu.children ?? [];
    // 递归检查子菜单中是否存在目标路径
    if (children.length > 0 && hasMenuPath(children, targetPath)) {
      return true;
    }
  }
  return false;
}

/**
 * 递归移除菜单列表中指定路径的菜单项
 * @param menus - 原始菜单列表
 * @param targetPath - 需要移除的目标路径
 * @returns 过滤后的新菜单列表
 */
function removeMenuByPath(
  menus: AccessMenuItem[],
  targetPath: string,
): AccessMenuItem[] {
  // 创建新数组存储过滤后的菜单项
  const next: AccessMenuItem[] = [];
  for (const menu of menus) {
    // 跳过匹配目标路径的菜单项
    if (menu.path === targetPath) continue;

    const children = menu.children ?? [];
    // 递归处理子菜单列表
    const nextChildren =
      children.length > 0 ? removeMenuByPath(children, targetPath) : [];
    // 重构菜单对象并加入结果数组，若子菜单为空则移除 children 属性
    next.push(
      children.length > 0
        ? {
            ...menu,
            children: nextChildren.length > 0 ? nextChildren : undefined,
          }
        : menu,
    );
  }
  return next;
}

/**
 * 根据需要刷新菜单缓存
 * 检查权限状态，生成可访问菜单和路由，更新 store，并在当前路由不可访问时重定向
 *
 * @returns {Promise<void>}
 */
async function refreshMenuCacheIfNeeded() {
  if (!accessStore.isAccessChecked) return;

  // 获取用户角色并生成可访问的菜单和路由
  const userRoles = userStore.userInfo?.roles ?? [];
  const { accessibleMenus, accessibleRoutes } = await generateAccess({
    roles: userRoles,
    router,
    routes: accessRoutes,
  });
  // 更新权限存储
  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(accessibleRoutes);

  // 异步刷新完成后，如果当前路由已不可访问，自动回退到首个可访问菜单
  const currentPath = router.currentRoute.value.path;
  const inMenus = hasMenuPath(accessibleMenus as AccessMenuItem[], currentPath);
  if (!inMenus) {
    const firstMenuPath = getFirstMenuPath(accessibleMenus as AccessMenuItem[]);
    const fallbackPath =
      firstMenuPath ||
      preferences.app.defaultHomePath ||
      userStore.userInfo?.homePath;
    if (fallbackPath && fallbackPath !== currentPath) {
      await router.replace(fallbackPath);
    }
  }
}

/**
 * 处理菜单变更事件
 * 依次执行数据获取与菜单缓存刷新
 * @returns {Promise<void>}
 */
async function handleMenuChanged() {
  await reloadMenuGrid();
  // 后台异步刷新左侧菜单/路由，不阻塞列表刷新
  void refreshMenuCacheIfNeeded();
}

/**
 * 处理添加或更新成功后的逻辑
 * 执行菜单变更处理
 * @returns {Promise} 异步操作 Promise
 */
async function handleAddOrUpdateSuccess() {
  await handleMenuChanged();
}

/**
 * 处理删除成功后的回调
 * @param {BackendMenuItem} record - 被删除的菜单项数据
 * @returns {Promise<void>}
 */
async function handleDeleteSuccess(record: BackendMenuItem) {
  await reloadMenuGrid();

  // 删除场景不强制全量 generateAccess 重算：尽量做本地菜单缓存裁剪
  const cachedMenus = (accessStore.accessMenus ??
    []) as unknown as AccessMenuItem[];
  if (cachedMenus.length > 0 && record.routePath) {
    const nextMenus = removeMenuByPath(cachedMenus, record.routePath);
    accessStore.setAccessMenus(nextMenus as any);

    // 仅当“当前路由失效”（刚删的是当前路由，或已不在菜单树里）才做跳转兜底
    const currentPath = router.currentRoute.value.path;
    const routeRemoved = currentPath === record.routePath;
    const stillInMenus = hasMenuPath(nextMenus, currentPath);
    if (routeRemoved || !stillInMenus) {
      const firstMenuPath = getFirstMenuPath(nextMenus);
      const fallbackPath =
        firstMenuPath ||
        preferences.app.defaultHomePath ||
        userStore.userInfo?.homePath;
      if (fallbackPath && fallbackPath !== currentPath) {
        await router.replace(fallbackPath);
      }
    }
  }
}

async function handleBatchDeleteSuccess() {
  await reloadMenuGrid();
  // 批量删除无法精确裁剪本地菜单树，改为后台异步全量刷新（不阻塞列表刷新）
  void refreshMenuCacheIfNeeded();
}

function getSearchPayload(): Partial<MenuPageParams> {
  const featureName = inputKeyword.value.trim();
  if (!featureName) {
    return {};
  }
  return { featureName };
}

async function reloadMenuGrid() {
  await gridApi.reload(getSearchPayload());
}

onMounted(() => {
  void reloadMenuGrid();
});
</script>

<template>
  <Page
    :title="$t('menu.title')"
    :auto-content-height="true"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域 -->
    <div
      class="flex items-center justify-between rounded-lg border border-border bg-background p-6"
    >
      <div class="flex items-center gap-2">
        <span class="shrink-0 text-sm text-muted-foreground">{{
          $t('menu.list.featureName')
        }}</span>
        <VbenInput
          v-model="inputKeyword"
          class="w-56 [&_input]:h-8"
          :placeholder="$t('menu.list.placeholder')"
          @keydown.enter="handleSearch"
        />
      </div>
      <Space>
        <VbenButton
          class="w-[60px]"
          size="sm"
          variant="outline"
          @click="handleReset"
        >
          {{ $t('menu.action.reset') }}
        </VbenButton>
        <VbenButton class="w-[60px]"
size="sm" @click="handleSearch">
          {{ $t('menu.action.search') }}
        </VbenButton>
      </Space>
    </div>

    <!-- 表格卡片 -->
    <div
      class="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background"
    >
      <!-- 操作栏 -->
      <div class="flex items-center justify-end gap-2 border-border p-6">
        <VbenButton class="w-[84px]"
size="sm" @click="() => handleAdd()">
          <Plus class="mr-1 size-4" />
          {{ $t('common.create') }}
        </VbenButton>
        <VbenButton
          size="sm"
          class="w-[84px]"
          :disabled="selectedRowIds.length === 0"
          variant="outline-destructive"
          @click="handleBatchDelete"
        >
          <Trash2 class="mr-1 size-4" />
          {{ $t('common.delete') }}
        </VbenButton>
      </div>

      <Grid>
        <template #action="{ row }">
          <Space size="small">
            <VbenButton size="sm"
variant="ghost" @click="handleEdit(row)">
              <span class="text-primary">
                {{ $t('menu.action.edit') }}
              </span>
            </VbenButton>
            <VbenButton size="sm"
variant="ghost" @click="handleDelete(row)">
              <span class="text-destructive">{{
                $t('menu.action.delete')
              }}</span>
            </VbenButton>
            <VbenButton size="sm"
variant="ghost" @click="handleAdd(row)">
              <span class="text-primary">{{ $t('menu.action.addChild') }}</span>
            </VbenButton>
          </Space>
        </template>
      </Grid>
    </div>

    <!-- 新增/编辑弹窗 -->
    <AddOrUpdate ref="addOrUpdateRef"
@success="handleAddOrUpdateSuccess" />
  </Page>
</template>
