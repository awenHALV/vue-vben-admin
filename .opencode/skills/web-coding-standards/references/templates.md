# 页面模板集合

## 1. 用户管理页面

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '#/locales';

import { Button, Card, Form, FormItem, Input, InputSearch, Space, Tag, Tree } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDeptTreeApi, getUserPageApi } from '#/api/system/user';
import UserForm from './components/UserForm.vue';

defineOptions({ name: 'SystemUser' });

// ==================== 状态定义 ====================

const selectedDeptId = ref<string>('');
const deptTreeData = ref<DeptTreeNode[]>([]);
const searchKey = ref('');
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

const searchForm = reactive({
  account: '',
  name: '',
});

const formVisible = ref(false);
const formType = ref<'add' | 'edit'>('add');
const formData = ref<Partial<UserInfo>>({});

// ==================== 计算属性 ====================

const filteredDeptTree = computed(() => {
  if (!searchKey.value) return deptTreeData.value;
  return filterTree(deptTreeData.value, searchKey.value.toLowerCase());
});

// ==================== VxeGrid 配置 ====================

const [Grid, gridApi] = useVbenVxeGrid<UserInfo>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: { isHover: true },
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any) => {
          if (!selectedDeptId.value) {
            return { records: [], total: 0 };
          }
          const params = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
            deptId: selectedDeptId.value,
            ...searchForm,
          };
          const res = await getUserPageApi(params);
          return {
            records: res?.records || [],
            total: res?.total || 0,
          };
        },
      },
      response: {
        result: 'records',
        total: 'total',
        list: 'records',
      },
    },
    columns: [
      { type: 'seq', title: $t('system.user.num'), width: 60 },
      { field: 'account', title: $t('system.user.account'), minWidth: 120 },
      { field: 'name', title: $t('system.user.name'), minWidth: 100 },
      {
        field: 'roleName',
        title: $t('system.user.role'),
        minWidth: 180,
        align: 'left',
        slots: { default: 'roleName' },
      },
      {
        field: 'deptName',
        title: $t('system.user.org'),
        minWidth: 150,
        align: 'left',
      },
      {
        field: 'status',
        title: $t('system.common.status'),
        width: 80,
        formatter: ({ cellValue }: any) => {
          return cellValue === 1 ? $t('system.common.normal') : $t('system.common.disabled');
        },
      },
      {
        title: $t('system.common.operation'),
        width: 200,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});

// ==================== 方法 ====================

function filterTree(data: DeptTreeNode[], keyword: string): DeptTreeNode[] {
  const result: DeptTreeNode[] = [];
  for (const item of data) {
    if (item.deptName.toLowerCase().includes(keyword)) {
      result.push({ ...item });
    } else if (item.children?.length) {
      const filteredChildren = filterTree(item.children, keyword);
      if (filteredChildren.length) {
        result.push({ ...item, children: filteredChildren });
      }
    }
  }
  return result;
}

async function loadDeptTree() {
  deptTreeData.value = await getDeptTreeApi();
  if (deptTreeData.value.length > 0) {
    selectedDeptId.value = deptTreeData.value[0].id;
  }
}

function onSelectDept(keys: string[]) {
  if (keys.length > 0) {
    selectedDeptId.value = keys[0];
    gridApi.reload();
  }
}

function handleAdd() {
  formType.value = 'add';
  formData.value = {};
  formVisible.value = true;
}

function handleEdit(record: UserInfo) {
  formType.value = 'edit';
  formData.value = { ...record };
  formVisible.value = true;
}

async function handleDelete(record: UserInfo) {
  Modal.confirm({
    title: $t('common.confirmDelete'),
    content: $t('system.user.deleteConfirm', { name: record.name }),
    async onOk() {
      await deleteUserApi(record.id!);
      message.success($t('common.deleteSuccess'));
      gridApi.reload();
    },
  });
}

function handleSearch() {
  gridApi.reload();
}

function handleReset() {
  searchForm.account = '';
  searchForm.name = '';
  gridApi.reload();
}

function handleFormSaved() {
  formVisible.value = false;
  gridApi.reload();
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadDeptTree();
});
</script>

<template>
  <Page>
    <div class="flex h-full gap-4">
      <!-- 左侧部门树 -->
      <Card class="w-64 flex-shrink-0" :bordered="false">
        <InputSearch v-model:value="searchKey" class="mb-2" :placeholder="$t('common.search')" />
        <Tree
          :data="filteredDeptTree"
          :selected-keys="selectedKeys"
          :field-names="{ children: 'children', title: 'deptName', key: 'id' }"
          @select="onSelectDept"
        />
      </Card>

      <!-- 右侧用户列表 -->
      <div class="flex-1 overflow-hidden">
        <Card :bordered="false">
          <!-- 搜索栏 -->
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <Form :model="searchForm" layout="inline">
              <FormItem :label="$t('system.user.account')" name="account">
                <Input v-model:value="searchForm.account" :placeholder="$t('system.user.account')" allow-clear />
              </FormItem>
              <FormItem :label="$t('system.user.name')" name="name">
                <Input v-model:value="searchForm.name" :placeholder="$t('system.user.name')" allow-clear />
              </FormItem>
              <FormItem>
                <Space>
                  <Button type="primary" @click="handleSearch">
                    {{ $t('common.search') }}
                  </Button>
                  <Button @click="handleReset">
                    {{ $t('common.reset') }}
                  </Button>
                </Space>
              </FormItem>
            </Form>
          </div>

          <!-- 工具栏 -->
          <div class="mb-4 flex justify-between">
            <div>
              <Button type="primary" @click="handleAdd">
                <Plus class="mr-1" />
                {{ $t('system.user.addUser') }}
              </Button>
            </div>
          </div>

          <!-- 表格 -->
          <Grid>
            <template #roleName="{ row }">
              <template v-for="role in row.roleNames" :key="role">
                <Tag class="mr-1">{{ role }}</Tag>
              </template>
            </template>

            <template #action="{ row }">
              <Button type="link" @click="handleEdit(row)">
                {{ $t('common.edit') }}
              </Button>
              <Button type="link" danger @click="handleDelete(row)">
                {{ $t('common.delete') }}
              </Button>
            </template>
          </Grid>
        </Card>
      </div>
    </div>

    <!-- 用户表单弹窗 -->
    <UserForm
      v-model:visible="formVisible"
      :type="formType"
      :data="formData"
      @success="handleFormSaved"
    />
  </Page>
</template>
```

## 2. 角色管理页面

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '#/locales';

import { Button, Card, Form, FormItem, Input, InputSearch, Modal, Space, Tag, Tree } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getRolePageApi, deleteRoleApi } from '#/api/system/role';
import { getOrgTreeApi } from '#/api/system/org';
import RoleForm from './components/RoleForm.vue';
import RolePermission from './components/RolePermission.vue';

defineOptions({ name: 'SystemRole' });

// ==================== 状态定义 ====================

const selectedDeptId = ref<string>('');
const deptTreeData = ref<OrgInfo[]>([]);
const searchKey = ref('');
const selectedKeys = ref<string[]>([]);

const searchForm = reactive({
  roleName: '',
});

const formVisible = ref(false);
const formType = ref<'add' | 'edit'>('add');
const formData = ref<Partial<RoleInfo>>({});

const permissionVisible = ref(false);
const permissionData = ref<Partial<RoleInfo>>({});

// ==================== 计算属性 ====================

const filteredDeptTree = computed(() => {
  if (!searchKey.value) return deptTreeData.value;
  return filterTree(deptTreeData.value, searchKey.value.toLowerCase());
});

// ==================== VxeGrid 配置 ====================

const [Grid, gridApi] = useVbenVxeGrid<RoleInfo>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: { isHover: true },
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any) => {
          if (!selectedDeptId.value) {
            return { records: [], total: 0 };
          }
          const params = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
            deptId: selectedDeptId.value,
            ...searchForm,
          };
          const res = await getRolePageApi(params);
          return {
            records: res?.records || [],
            total: res?.total || 0,
          };
        },
      },
      response: {
        result: 'records',
        total: 'total',
        list: 'records',
      },
    },
    columns: [
      { field: 'roleName', title: $t('system.role.roleName'), minWidth: 150 },
      { field: 'roleCode', title: $t('system.role.roleCode'), minWidth: 120 },
      {
        field: 'status',
        title: $t('system.common.status'),
        width: 80,
        formatter: ({ cellValue }: any) => {
          return cellValue === 1 ? $t('system.common.normal') : $t('system.common.disabled');
        },
      },
      {
        title: $t('system.common.operation'),
        width: 200,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});

// ==================== 方法 ====================

function filterTree(data: OrgInfo[], keyword: string): OrgInfo[] {
  const result: OrgInfo[] = [];
  for (const item of data) {
    if (item.orgName.toLowerCase().includes(keyword)) {
      result.push({ ...item });
    } else if (item.children?.length) {
      const filteredChildren = filterTree(item.children, keyword);
      if (filteredChildren.length) {
        result.push({ ...item, children: filteredChildren });
      }
    }
  }
  return result;
}

async function loadOrgTree() {
  deptTreeData.value = await getOrgTreeApi();
  if (deptTreeData.value.length > 0) {
    selectedDeptId.value = deptTreeData.value[0].id;
  }
}

function onSelectDept(keys: string[]) {
  if (keys.length > 0) {
    selectedDeptId.value = keys[0];
    gridApi.reload();
  }
}

function handleAdd() {
  formType.value = 'add';
  formData.value = {};
  formVisible.value = true;
}

function handleEdit(record: RoleInfo) {
  formType.value = 'edit';
  formData.value = { ...record };
  formVisible.value = true;
}

function handlePermission(record: RoleInfo) {
  permissionData.value = { ...record };
  permissionVisible.value = true;
}

async function handleDelete(record: RoleInfo) {
  Modal.confirm({
    title: $t('common.confirmDelete'),
    content: $t('system.role.deleteConfirm', { name: record.roleName }),
    async onOk() {
      await deleteRoleApi(record.id!);
      message.success($t('common.deleteSuccess'));
      gridApi.reload();
    },
  });
}

function handleSearch() {
  gridApi.reload();
}

function handleReset() {
  searchForm.roleName = '';
  gridApi.reload();
}

function handleFormSaved() {
  formVisible.value = false;
  gridApi.reload();
}

function handlePermissionSaved() {
  permissionVisible.value = false;
  gridApi.reload();
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadOrgTree();
});
</script>

<template>
  <Page>
    <div class="flex h-full gap-4">
      <!-- 左侧组织树 -->
      <Card class="w-64 flex-shrink-0" :bordered="false">
        <InputSearch v-model:value="searchKey" class="mb-2" :placeholder="$t('common.search')" />
        <Tree
          :data="filteredDeptTree"
          :selected-keys="selectedKeys"
          :field-names="{ children: 'children', title: 'orgName', key: 'id' }"
          @select="onSelectDept"
        />
      </Card>

      <!-- 右侧角色列表 -->
      <div class="flex-1 overflow-hidden">
        <Card :bordered="false">
          <!-- 搜索栏 -->
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <Form :model="searchForm" layout="inline">
              <FormItem :label="$t('system.role.roleName')" name="roleName">
                <Input v-model:value="searchForm.roleName" :placeholder="$t('system.role.roleName')" allow-clear />
              </FormItem>
              <FormItem>
                <Space>
                  <Button type="primary" @click="handleSearch">
                    {{ $t('common.search') }}
                  </Button>
                  <Button @click="handleReset">
                    {{ $t('common.reset') }}
                  </Button>
                </Space>
              </FormItem>
            </Form>
          </div>

          <!-- 工具栏 -->
          <div class="mb-4 flex justify-between">
            <div>
              <Button type="primary" @click="handleAdd">
                <Plus class="mr-1" />
                {{ $t('system.role.addRole') }}
              </Button>
            </div>
          </div>

          <!-- 表格 -->
          <Grid>
            <template #action="{ row }">
              <Button type="link" @click="handleEdit(row)">
                {{ $t('common.edit') }}
              </Button>
              <Button type="link" @click="handlePermission(row)">
                {{ $t('system.role.permission') }}
              </Button>
              <Button type="link" danger @click="handleDelete(row)">
                {{ $t('common.delete') }}
              </Button>
            </template>
          </Grid>
        </Card>
      </div>
    </div>

    <!-- 角色表单弹窗 -->
    <RoleForm
      v-model:visible="formVisible"
      :type="formType"
      :data="formData"
      @success="handleFormSaved"
    />

    <!-- 权限分配弹窗 -->
    <RolePermission
      v-model:visible="permissionVisible"
      :data="permissionData"
      @success="handlePermissionSaved"
    />
  </Page>
</template>
```

## 3. 菜单管理页面

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { BackendMenuItem } from '#/api/core/menu';

import { onMounted, reactive, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus, Trash2 } from '@vben/icons';
import { $t } from '@vben/locales';

import { message, Modal, Space, Table } from 'antdv-next';

import { deleteFeatureApi, getRawMenusApi } from '#/api/core/menu';
import AddOrUpdate from './AddOrUpdate.vue';

defineOptions({ name: 'SystemMenu' });

// ==================== 状态定义 ====================

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

const searchForm = reactive<{ featureName: string }>({
  featureName: '',
});

const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);

// ==================== 方法 ====================

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

function handlePageChange(page: number) {
  pagination.current = page;
  fetchData({ featureName: searchForm.featureName });
}

function handleAdd(parent?: BackendMenuItem) {
  addOrUpdateRef.value?.open(parent);
}

function handleEdit(record: BackendMenuItem) {
  addOrUpdateRef.value?.open(undefined, record);
}

async function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    message.warning($t('menu.message.selectDelete'));
    return;
  }

  Modal.confirm({
    title: $t('common.confirmDelete'),
    content: $t('menu.message.confirmDelete'),
    async onOk() {
      try {
        await deleteFeatureApi(selectedRowKeys.value);
        message.success($t('common.deleteSuccess'));
        selectedRowKeys.value = [];
        fetchData();
      } catch {
        message.error($t('menu.message.deleteFailed'));
      }
    },
  });
}

function handleSaved() {
  fetchData({ featureName: searchForm.featureName });
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page>
    <div class="p-6">
      <!-- 搜索栏 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <VbenInput
          v-model:value="inputKeyword"
          :placeholder="$t('menu.list.featureName')"
          class="w-64"
          @search="handleSearch"
        />
        <Space>
          <Button type="primary" @click="handleSearch">
            {{ $t('common.search') }}
          </Button>
          <Button @click="handleReset">
            {{ $t('common.reset') }}
          </Button>
        </Space>
      </div>

      <!-- 工具栏 -->
      <div class="mb-4 flex justify-between">
        <div>
          <Button type="primary" @click="handleAdd()">
            <Plus class="mr-1" />
            {{ $t('menu.action.addTopMenu') }}
          </Button>
          <Button v-if="selectedRowKeys.length > 0" danger @click="handleBatchDelete">
            <Trash2 class="mr-1" />
            {{ $t('menu.action.batchDelete') }}
          </Button>
        </div>
      </div>

      <!-- 表格 -->
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :row-selection="{
          selectedRowKeys,
          onChange: (keys) => (selectedRowKeys = keys),
        }"
        @change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <Space>
              <Button type="link" @click="handleAdd(record)">
                {{ $t('menu.action.addChild') }}
              </Button>
              <Button type="link" @click="handleEdit(record)">
                {{ $t('common.edit') }}
              </Button>
              <Button type="link" danger @click="handleDelete(record)">
                {{ $t('common.delete') }}
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <AddOrUpdate ref="addOrUpdateRef" @success="handleSaved" />
  </Page>
</template>
```
