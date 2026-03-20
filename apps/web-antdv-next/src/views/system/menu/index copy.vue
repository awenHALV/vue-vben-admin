<script lang="ts" setup>
import type { BackendMenuItem, MenuPageParams } from '#/api/core/menu';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus, Trash2 } from '@vben/icons';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

// shadcn 原子（按需）
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@vben-core/shadcn-ui';

import { message, Modal, Space, Table } from 'antdv-next';

import { deleteFeatureApi, getRawMenusApi } from '#/api/core/menu';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';

import AddOrUpdate from './AddOrUpdate.vue';

defineOptions({ name: 'SystemMenu' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();

// ─── 状态 ───────────────────────────────────────────────────────────────
const loading = ref(false);
const tableData = ref<BackendMenuItem[]>([]);
const selectedRowKeys = ref<(number | string)[]>([]);

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
  showTotal: (total: number) => $t('menu.list.total', { 0: total }),
});

// 搜索条件
const searchForm = reactive<{ featureName: string }>({
  featureName: '',
});
const inputKeyword = ref('');

// ─── 新增/编辑弹窗 ───────────────────────────────────────────────────
const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);

function openAddModal(parent?: BackendMenuItem) {
  addOrUpdateRef.value?.open(parent);
}

function openEditModal(record: BackendMenuItem) {
  addOrUpdateRef.value?.open(undefined, record);
}

// ─── 数据加载 ─────────────────────────────────────────────────────────────
async function fetchData(params: MenuPageParams = {}) {
  loading.value = true;
  try {
    const res = await getRawMenusApi({
      current: pagination.current,
      size: pagination.pageSize,
      ...params,
    });
    tableData.value = res.items ?? [];
    pagination.total = res.total ?? 0;
  } catch {
    message.error($t('menu.message.fetchFailed'));
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchData());

// ─── 搜索 / 重置 ─────────────────────────────────────────────────────────
function handleSearch() {
  searchForm.featureName = inputKeyword.value;
  pagination.current = 1;
  fetchData({ featureName: searchForm.featureName });
}

function handleReset() {
  inputKeyword.value = '';
  searchForm.featureName = '';
  pagination.current = 1;
  fetchData();
}

// ─── 分页变化 ─────────────────────────────────────────────────────────────
function handlePageChange(page: number) {
  pagination.current = page;
  fetchData({ featureName: searchForm.featureName });
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
  if (selectedRowKeys.value.length === 0) {
    message.warning($t('menu.message.selectFirst'));
    return;
  }
  const confirmModal = Modal.confirm({
    title: $t('menu.action.batchDelete'),
    content: $t('menu.message.batchDeleteConfirm', {
      0: selectedRowKeys.value.length,
    }),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onCancel: () => {
      confirmModal.destroy();
    },
    onOk: async () => {
      await deleteFeatureApi(selectedRowKeys.value);
      message.success($t('menu.message.batchDeleteSuccess'));
      selectedRowKeys.value = [];
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
  // 根据功能名称获取数据列表
  await fetchData({ featureName: searchForm.featureName });
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
  await fetchData({ featureName: searchForm.featureName });

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
  await fetchData({ featureName: searchForm.featureName });
  // 批量删除无法精确裁剪本地菜单树，改为后台异步全量刷新（不阻塞列表刷新）
  void refreshMenuCacheIfNeeded();
}

// ─── 行多选 ───────────────────────────────────────────────────────────────
const rowSelection = {
  get selectedRowKeys() {
    return selectedRowKeys.value;
  },
  onChange: (keys: (number | string)[]) => {
    selectedRowKeys.value = keys;
  },
};

// ─── 表格列配置 ────────────────────────────────────────────────────────────
const columns = [
  {
    title: $t('menu.list.featureName'),
    dataIndex: 'featureName',
    key: 'featureName',
    width: 180,
  },
  {
    title: $t('menu.list.featureNameEn'),
    dataIndex: 'featureNameEn',
    key: 'featureNameEn',
    width: 180,
    ellipsis: true,
  },
  {
    title: $t('menu.list.featureCode'),
    dataIndex: 'featureCode',
    key: 'featureCode',
    width: 140,
    ellipsis: true,
  },
  {
    title: $t('menu.list.featureType'),
    dataIndex: 'featureType',
    key: 'featureType',
    width: 90,
    align: 'center' as const,
  },
  {
    title: $t('menu.list.featureIcon'),
    dataIndex: 'featureIcon',
    key: 'featureIcon',
    width: 90,
    align: 'center' as const,
  },
  {
    title: $t('menu.list.sort'),
    dataIndex: 'sort',
    key: 'sort',
    width: 90,
    align: 'center' as const,
  },
  {
    title: $t('menu.list.routePath'),
    dataIndex: 'routePath',
    key: 'routePath',
    width: 140,
    ellipsis: true,
  },
  {
    title: $t('menu.list.action'),
    key: 'action',
    width: 220,
    fixed: 'right' as const,
  },
];

const featureTypeMap: Record<string, { color: string; labelKey: string }> = {
  BUTTON: { color: 'purple', labelKey: 'menu.type.button' },
  MENU: { color: 'cyan', labelKey: 'menu.type.menu' },
};
</script>

<template>
  <Page
    title="菜单管理"
    :auto-content-height="true"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域 -->
    <div
      class="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 shadow-sm"
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
        <VbenButton class="w-[60px]" size="sm" @click="handleSearch">
          {{ $t('menu.action.search') }}
        </VbenButton>
      </Space>
</div>

      <!-- 表格卡片 -->
      <div
        class="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm"
      >
        <!-- 操作栏 -->
        <div
          class="flex items-center justify-end gap-2 border-b border-border px-4 py-3"
        >
          <VbenButton class="w-[84px]" size="sm" @click="() => handleAdd()">
            <Plus class="mr-1 size-4" />
            {{ $t('common.create') }}
          </VbenButton>
          <VbenButton
            size="sm"
            class="w-[84px]"
            :disabled="selectedRowKeys.length === 0"
            variant="outline-destructive"
            @click="handleBatchDelete"
          >
            <Trash2 class="mr-1 size-4" />
            {{ $t('common.delete') }}
          </VbenButton>
        </div>

        <!-- 树形表格 + 分页 -->
        <Table
          :columns="columns"
          :data-source="tableData"
          :loading="loading"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: pagination.showTotal,
            showSizeChanger: false,
            onChange: handlePageChange,
          }"
          :row-key="(record) => String((record as BackendMenuItem).id)"
          :row-selection="rowSelection"
          :scroll="{ x: 1200 }"
          child-row-key="children"
          class="flex-1"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <!-- 功能名称 -->
            <template v-if="column.key === 'featureName'">
              <span class="font-medium">
                {{ (record as BackendMenuItem).featureName }}
              </span>
            </template>

            <!-- 英文名称 -->
            <template v-else-if="column.key === 'featureNameEn'">
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="text-muted-foreground">
                    {{
                      (record.featureNameEn ?? '-').length > 14
                        ? `${record.featureNameEn!.slice(0, 14)}...`
                        : (record.featureNameEn ?? '-')
                    }}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {{ record.featureNameEn }}
                </TooltipContent>
              </Tooltip>
            </template>

            <!-- 功能编码 -->
            <template v-else-if="column.key === 'featureCode'">
              <Badge
                variant="secondary"
                class="bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
              >
                {{
                  (record as BackendMenuItem).featureCode.length > 10
                    ? `${(record as BackendMenuItem).featureCode.slice(
                        0,
                        10,
                      )}...`
                    : (record as BackendMenuItem).featureCode
                }}
              </Badge>
            </template>

            <!-- 功能类型 -->
            <template v-else-if="column.key === 'featureType'">
              {{
                featureTypeMap[(record as BackendMenuItem).featureType]
                  ? $t(
                      featureTypeMap[(record as BackendMenuItem).featureType]!
                        .labelKey,
                    )
                  : (record as BackendMenuItem).featureType
              }}
            </template>

            <!-- 功能图标 -->
            <template v-else-if="column.key === 'featureIcon'">
              <span
                v-if="(record as BackendMenuItem).featureIcon"
                class="text-base"
              >
                {{ (record as BackendMenuItem).featureIcon }}
              </span>
              <span v-else class="text-muted-foreground">-</span>
            </template>

            <!-- 功能排序 -->
            <template v-else-if="column.key === 'sort'">
              {{ (record as BackendMenuItem).sort ?? '-' }}
            </template>

            <!-- 路由地址 -->
            <template v-else-if="column.key === 'routePath'">
              <Tooltip :title="(record as BackendMenuItem).routePath">
                <code class="rounded-sm bg-muted px-1 py-0.5 text-xs">
                  {{
                    (record as BackendMenuItem).routePath.length > 12
                      ? `${(record as BackendMenuItem).routePath.slice(0, 12)}...`
                      : (record as BackendMenuItem).routePath
                  }}
                </code>
              </Tooltip>
            </template>

            <!-- 操作 -->
            <template v-else-if="column.key === 'action'">
              <Space size="small">
                <VbenButton
                  size="sm"
                  variant="ghost"
                  @click="handleEdit(record as BackendMenuItem)"
                >
                  {{ $t('menu.action.edit') }}
                </VbenButton>
                <VbenButton
                  size="sm"
                  variant="ghost"
                  @click="handleDelete(record as BackendMenuItem)"
                >
                  <span class="text-destructive">{{
                    $t('menu.action.delete')
                  }}</span>
                </VbenButton>
                <VbenButton
                  size="sm"
                  variant="ghost"
                  @click="handleAdd(record as BackendMenuItem)"
                >
                  <span class="text-primary">{{
                    $t('menu.action.addChild')
                  }}</span>
                </VbenButton>
              </Space>
            </template>
          </template>
        </Table>
      </div>

      <!-- 新增/编辑弹窗 -->
      <AddOrUpdate ref="addOrUpdateRef" @success="handleAddOrUpdateSuccess" />
    </div>
  </Page>
</template>
