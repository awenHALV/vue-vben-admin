<script lang="ts" setup>
import type { BackendMenuItem, MenuPageParams } from '#/api/core/menu';

import { onMounted, reactive, ref } from 'vue';

import { Page, VbenButton } from '@vben/common-ui';
import { Plus, Search, SquarePen, Trash2 } from '@vben/icons';

import {
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antdv-next';

import { createFeatureApi, getRawMenusApi } from '#/api/core/menu';

defineOptions({ name: 'SystemMenu' });

// ─── 状态 ───────────────────────────────────────────────────────────────
const loading = ref(false);
const tableData = ref<BackendMenuItem[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: false,
  showTotal: (total: number) => `共 ${total} 条`,
});

// 搜索条件
const searchForm = reactive<{ featureName: string }>({
  featureName: '',
});
const inputKeyword = ref('');

// ─── 新增菜单弹窗 ───────────────────────────────────────────────────────
const addModalVisible = ref(false);
const addModalTitle = ref('新增菜单');
const addModalLoading = ref(false);
const currentParentMenu = ref<BackendMenuItem | null>(null);

const addFormRef = ref<InstanceType<typeof Form> | null>(null);
const addFormState = reactive({
  parentId: null as number | string | null,
  featureType: 'MENU',
  featureCode: '',
  featureName: '',
  featureNameEn: '',
  featureIcon: '',
  sort: 0,
  routePath: '',
});

const featureTypeOptions = [
  { label: '菜单', value: 'MENU' },
  { label: '按钮', value: 'BUTTON' },
  { label: '接口', value: 'API' },
];

function resetAddForm() {
  addFormState.parentId = null;
  addFormState.featureType = 'MENU';
  addFormState.featureCode = '';
  addFormState.featureName = '';
  addFormState.featureNameEn = '';
  addFormState.featureIcon = '';
  addFormState.sort = 0;
  addFormState.routePath = '';
}

function openAddModal(parent?: BackendMenuItem) {
  resetAddForm();
  currentParentMenu.value = parent ?? null;
  addModalTitle.value = parent
    ? `新增子菜单 - ${parent.featureName}`
    : '新增菜单';
  if (parent) {
    addFormState.parentId = parent.id;
  }
  addModalVisible.value = true;
}

async function handleAddSubmit() {
  try {
    await (addFormRef.value as any).validate();
    addModalLoading.value = true;
    await createFeatureApi({
      featureCode: addFormState.featureCode,
      featureIcon: addFormState.featureIcon || '',
      featureName: addFormState.featureName,
      featureNameEn: addFormState.featureNameEn || '',
      featureType: addFormState.featureType,
      parentId: addFormState.parentId ?? null,
      routePath: addFormState.routePath || '',
      sort: addFormState.sort ?? 0,
    });
    message.success('新增成功');
    addModalVisible.value = false;
    fetchData({ featureName: searchForm.featureName });
  } catch {
    // error handled by API
  } finally {
    addModalLoading.value = false;
  }
}

function handleAddCancel() {
  addModalVisible.value = false;
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
    message.error('获取菜单列表失败');
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
  message.info(`编辑：${record.featureName}（待接入编辑弹窗）`);
}

function handleDelete(record: BackendMenuItem) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除菜单「${record.featureName}」吗？此操作不可撤销。`,
    okType: 'danger',
    onOk: async () => {
      message.success(`已删除：${record.featureName}（待接入删除接口）`);
      fetchData({ featureName: searchForm.featureName });
    },
  });
}

function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的菜单');
    return;
  }
  Modal.confirm({
    title: '批量删除',
    content: `确定删除所选 ${selectedRowKeys.value.length} 项菜单？`,
    okType: 'danger',
    onOk: async () => {
      message.success('批量删除成功（待接入删除接口）');
      selectedRowKeys.value = [];
      fetchData({ featureName: searchForm.featureName });
    },
  });
}

// ─── 行多选 ───────────────────────────────────────────────────────────────
const rowSelection = {
  get selectedRowKeys() {
    return selectedRowKeys.value;
  },
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;
  },
};

// ─── 表格列配置 ────────────────────────────────────────────────────────────
const columns = [
  {
    title: '功能名称',
    dataIndex: 'featureName',
    key: 'featureName',
    width: 180,
  },
  {
    title: '英文名称',
    dataIndex: 'featureNameEn',
    key: 'featureNameEn',
    width: 180,
    ellipsis: true,
  },
  {
    title: '功能编码',
    dataIndex: 'featureCode',
    key: 'featureCode',
    width: 140,
    ellipsis: true,
  },
  {
    title: '功能类型',
    dataIndex: 'featureType',
    key: 'featureType',
    width: 90,
    align: 'center' as const,
  },
  {
    title: '功能图标',
    dataIndex: 'featureIcon',
    key: 'featureIcon',
    width: 90,
    align: 'center' as const,
  },
  {
    title: '功能排序',
    dataIndex: 'sort',
    key: 'sort',
    width: 90,
    align: 'center' as const,
  },
  {
    title: '路由地址',
    dataIndex: 'routePath',
    key: 'routePath',
    width: 140,
    ellipsis: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 220,
    fixed: 'right' as const,
  },
];

const featureTypeMap: Record<string, { color: string; label: string }> = {
  API: { color: 'orange', label: '接口' },
  BUTTON: { color: 'purple', label: '按钮' },
  MENU: { color: 'cyan', label: '菜单' },
};
</script>

<template>
  <Page :auto-content-height="true" content-class="flex flex-col gap-3 p-4">
    <!-- 搜索区域 -->
    <div
      class="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 shadow-sm"
    >
      <div class="flex items-center gap-2">
        <span class="shrink-0 text-sm text-muted-foreground">功能名称</span>
        <Input
          v-model:value="inputKeyword"
          allow-clear
          class="w-56"
          placeholder="请输入菜单名称"
          @press-enter="handleSearch"
        />
      </div>
      <Space>
        <VbenButton @click="handleSearch">
          <Search class="mr-1 size-4" />
          搜索
        </VbenButton>
        <VbenButton variant="outline" @click="handleReset">重置</VbenButton>
      </Space>
    </div>

    <!-- 表格卡片 -->
    <div
      class="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm"
    >
      <!-- 操作栏 -->
      <div class="flex items-center gap-2 border-b border-border px-4 py-3">
        <VbenButton @click="() => handleAdd()">
          <Plus class="mr-1 size-4" />
          新增
        </VbenButton>
        <VbenButton
          :disabled="selectedRowKeys.length === 0"
          variant="destructive"
          @click="handleBatchDelete"
        >
          <Trash2 class="mr-1 size-4" />
          删除
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
            <Tooltip :title="(record as BackendMenuItem).featureNameEn">
              <span class="text-muted-foreground">
                {{
                  ((record as BackendMenuItem).featureNameEn ?? '-').length > 14
                    ? `${(record as BackendMenuItem).featureNameEn!.slice(
                        0,
                        14,
                      )}...`
                    : ((record as BackendMenuItem).featureNameEn ?? '-')
                }}
              </span>
            </Tooltip>
          </template>

          <!-- 功能编码 -->
          <template v-else-if="column.key === 'featureCode'">
            <Tooltip :title="(record as BackendMenuItem).featureCode">
              <Tag class="cursor-default font-mono text-xs" color="blue">
                {{
                  (record as BackendMenuItem).featureCode.length > 10
                    ? `${(record as BackendMenuItem).featureCode.slice(
                        0,
                        10,
                      )}...`
                    : (record as BackendMenuItem).featureCode
                }}
              </Tag>
            </Tooltip>
          </template>

          <!-- 功能类型 -->
          <template v-else-if="column.key === 'featureType'">
            <Tag
              :color="
                featureTypeMap[(record as BackendMenuItem).featureType]
                  ?.color ?? 'default'
              "
            >
              {{
                featureTypeMap[(record as BackendMenuItem).featureType]
                  ?.label ?? (record as BackendMenuItem).featureType
              }}
            </Tag>
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
                <SquarePen class="mr-1 size-3.5" />
                编辑
              </VbenButton>
              <VbenButton
                size="sm"
                variant="ghost"
                @click="handleDelete(record as BackendMenuItem)"
              >
                <Trash2 class="mr-1 size-3.5 text-destructive" />
                <span class="text-destructive">删除</span>
              </VbenButton>
              <VbenButton
                size="sm"
                variant="ghost"
                @click="handleAdd(record as BackendMenuItem)"
              >
                <Plus class="mr-1 size-3.5 text-primary" />
                <span class="text-primary">新增子项</span>
              </VbenButton>
            </Space>
          </template>
        </template>
      </Table>
    </div>

    <!-- 新增菜单弹窗 -->
    <Modal
      v-model:open="addModalVisible"
      :confirm-loading="addModalLoading"
      :title="addModalTitle"
      :width="560"
      destroy-on-close
      @cancel="handleAddCancel"
      @ok="handleAddSubmit"
    >
      <Form
        ref="addFormRef"
        :label-col="{ span: 6 }"
        :model="addFormState"
        :wrapper-col="{ span: 16 }"
        class="pt-4"
      >
        <FormItem
          :rules="[{ required: true, message: '请选择功能类型' }]"
          label="功能类型"
          name="featureType"
        >
          <Select v-model:value="addFormState.featureType" placeholder="请选择功能类型">
            <SelectOption
              v-for="item in featureTypeOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </SelectOption>
          </Select>
        </FormItem>

        <FormItem
          :rules="[{ required: true, message: '请输入功能编码' }]"
          label="功能编码"
          name="featureCode"
        >
          <Input v-model:value="addFormState.featureCode" placeholder="请输入功能编码" />
        </FormItem>

        <FormItem
          :rules="[{ required: true, message: '请输入功能名称' }]"
          label="功能名称"
          name="featureName"
        >
          <Input v-model:value="addFormState.featureName" placeholder="请输入功能名称" />
        </FormItem>

        <FormItem label="英文名称" name="featureNameEn">
          <Input v-model:value="addFormState.featureNameEn" placeholder="请输入英文名称" />
        </FormItem>

        <FormItem label="功能图标" name="featureIcon">
          <Input v-model:value="addFormState.featureIcon" placeholder="请输入功能图标" />
        </FormItem>

        <FormItem label="路由地址" name="routePath">
          <Input v-model:value="addFormState.routePath" placeholder="请输入路由地址" />
        </FormItem>

        <FormItem label="排序号" name="sort">
          <Input v-model:value="addFormState.sort" placeholder="请输入排序号" type="number" />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
