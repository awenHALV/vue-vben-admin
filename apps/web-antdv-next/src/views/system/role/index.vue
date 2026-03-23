<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';
import type { OrgInfo } from '#/api/system/org';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputSearch,
  message,
  Modal,
  Space,
  Table,
  Tree,
} from 'antdv-next';
import type { TableColumnsType, TreeProps } from 'antdv-next';

import { getRolePageApi, deleteRoleApi } from '#/api/system/role';
import { getOrgTreeApi } from '#/api/system/org';
import RoleForm from './components/RoleForm.vue';
import RolePermission from './components/RolePermission.vue';

// ==================== 状态定义 ====================

const loading = ref(false);
const tableData = ref<RoleInfo[]>([]);
const selectedDeptId = ref<string>('');

// 部门树相关
const deptTreeData = ref<OrgInfo[]>([]);
const searchKey = ref('');
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 搜索表单
const searchForm = reactive({
  roleName: '',
});

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '30', '50', '100'],
});

// 弹窗状态
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

const columns: TableColumnsType = [
  {
    title: $t('system.role.roleName'),
    dataIndex: 'roleName',
    width: 150,
    ellipsis: true,
    align: 'center',
  },
  {
    title: $t('system.role.organization'),
    dataIndex: 'deptName',
    width: 150,
    ellipsis: true,
    align: 'center',
  },
  {
    title: $t('system.common.operation'),
    key: 'action',
    width: 200,
    align: 'center',
    fixed: 'right',
  },
];

// ==================== 方法 ====================

function filterTree(data: OrgInfo[], keyword: string): OrgInfo[] {
  const result: OrgInfo[] = [];
  for (const item of data) {
    if (item.deptName.toLowerCase().includes(keyword)) {
      result.push({ ...item });
    } else if (item.children?.length) {
      const children = filterTree(item.children, keyword);
      if (children.length) {
        result.push({ ...item, children });
      }
    }
  }
  return result;
}

const getDeptTree = async () => {
  try {
    const res = await getOrgTreeApi();
    deptTreeData.value = res || [];
    const allKeys = getAllKeys(deptTreeData.value);
    expandedKeys.value = allKeys;
    if (deptTreeData.value.length > 0) {
      const firstKey = getFirstKey(deptTreeData.value);
      if (firstKey) {
        selectedKeys.value = [firstKey];
        selectedDeptId.value = firstKey;
      }
    }
  } catch (error) {
    console.error('获取部门树失败:', error);
  }
};

function getAllKeys(data: OrgInfo[]): string[] {
  const keys: string[] = [];
  for (const item of data) {
    keys.push(item.id);
    if (item.children?.length) {
      keys.push(...getAllKeys(item.children));
    }
  }
  return keys;
}

function getFirstKey(data: OrgInfo[]): string | null {
  if (data.length === 0) return null;
  return data[0].id;
}

const getRoleList = async () => {
  if (!selectedDeptId.value) return;
  try {
    loading.value = true;
    const res = await getRolePageApi({
      current: pagination.current,
      size: pagination.pageSize,
      deptId: selectedDeptId.value,
      ...searchForm,
    });
    tableData.value = res?.records || [];
    pagination.total = res?.total || 0;
  } catch (error) {
    console.error('获取角色列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  getRoleList();
};

const handleReset = () => {
  searchForm.roleName = '';
  pagination.current = 1;
  getRoleList();
};

const handleTableChange = (pag: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  getRoleList();
};

const handleDeptSelect: TreeProps['onSelect'] = (keys) => {
  if (keys.length > 0) {
    selectedKeys.value = keys as string[];
    selectedDeptId.value = keys[0] as string;
  }
};

const handleAdd = () => {
  formType.value = 'add';
  formData.value = { deptId: selectedDeptId.value };
  formVisible.value = true;
};

const handleEdit = (record: RoleInfo) => {
  formType.value = 'edit';
  formData.value = { ...record };
  formVisible.value = true;
};

const handleDelete = async (record: RoleInfo) => {
  if (record.roleAlias === 'admin') {
    message.warning('管理员角色不能删除');
    return;
  }

  Modal.confirm({
    title: $t('system.role.deleteTip'),
    content: $t('system.role.deleteContent'),
    okText: $t('system.common.ok'),
    cancelText: $t('system.common.cancel'),
    onOk: async () => {
      try {
        await deleteRoleApi(record.id);
        message.success($t('system.common.deleteSuccess'));
        getRoleList();
      } catch (error: any) {
        message.error(error?.message || $t('system.common.deleteFailed'));
      }
    },
  });
};

const handlePermission = (record: RoleInfo) => {
  permissionData.value = { ...record };
  permissionVisible.value = true;
};

const handleFormSuccess = () => {
  formVisible.value = false;
  getRoleList();
};

const handlePermissionSuccess = () => {
  permissionVisible.value = false;
};

// ==================== 生命周期 ====================

onMounted(() => {
  getDeptTree();
});

watch(selectedDeptId, () => {
  pagination.current = 1;
  getRoleList();
});
</script>

<template>
  <Page auto-content-height :title="$t('system.role.title')">
    <div class="flex h-full gap-4">
      <!-- 左侧组织树 -->
      <Card class="w-80 flex-shrink-0">
        <div class="mb-3">
          <InputSearch
            v-model:value="searchKey"
            :placeholder="$t('system.role.organizationPlaceholder')"
            allow-clear
          />
        </div>
        <Tree
          v-model:expandedKeys="expandedKeys"
          v-model:selectedKeys="selectedKeys"
          :tree-data="filteredDeptTree"
          :field-names="{ title: 'deptName', key: 'id', children: 'children' }"
          block-node
          class="h-[calc(100%-60px)]"
          @select="handleDeptSelect"
        />
      </Card>

      <!-- 右侧内容区 -->
      <div class="flex-1 flex flex-col min-w-0 gap-4">
        <!-- 搜索表单 -->
        <Card>
          <div class="flex justify-between items-start">
            <Form layout="inline">
              <FormItem :label="$t('system.role.roleName')">
                <Input
                  v-model:value="searchForm.roleName"
                  :placeholder="$t('system.role.roleNamePlaceholder')"
                  allow-clear
                  style="width: 240px"
                />
              </FormItem>
            </Form>
            <Space>
              <Button type="primary" class="w-21" @click="handleSearch">
                <template #icon><IconifyIcon icon="lucide:search" /></template>
                {{ $t('system.common.search') }}
              </Button>
              <Button class="w-21" @click="handleReset">
                <template #icon><IconifyIcon icon="lucide:rotate-ccw" /></template>
                {{ $t('system.common.reset') }}
              </Button>
            </Space>
          </div>
        </Card>

        <!-- 角色列表 -->
        <Card class="flex-1 min-h-0">
          <!-- 操作按钮 -->
          <div class="mb-4 flex justify-end">
            <Button type="primary" class="w-21" @click="handleAdd">
              <template #icon><IconifyIcon icon="lucide:plus" /></template>
              {{ $t('system.common.add') }}
            </Button>
          </div>
          <Table
            :columns="columns"
            :data-source="tableData"
            :loading="loading"
            :pagination="pagination"
            :scroll="{ x: 500 }"
            row-key="id"
            size="middle"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <Space v-if="record.roleAlias !== 'admin'">
                  <a @click="handleEdit(record)">{{ $t('system.common.edit') }}</a>
                  <a style="color: #ef4444" @click="handleDelete(record)">{{
                    $t('system.common.delete')
                  }}</a>
                  <a @click="handlePermission(record)">{{ $t('system.role.permission') }}</a>
                </Space>
              </template>
            </template>
          </Table>
        </Card>
      </div>
    </div>

    <!-- 角色表单弹窗 -->
    <RoleForm
      v-model:visible="formVisible"
      :type="formType"
      :data="formData"
      @success="handleFormSuccess"
    />

    <!-- 权限配置弹窗 -->
    <RolePermission
      v-model:visible="permissionVisible"
      :data="permissionData"
      @success="handlePermissionSuccess"
    />
  </Page>
</template>

<style scoped>
:deep(.ant-btn),
:deep(.ant-input),
:deep(.ant-select-selector),
:deep(.ant-card),
:deep(.ant-tag),
:deep(.ant-pagination-item),
:deep(.ant-pagination-prev),
:deep(.ant-pagination-next),
:deep(.ant-tree),
:deep(.ant-table-wrapper) {
  border-radius: 0 !important;
}

:deep(.ant-input-affix-wrapper),
:deep(.ant-input-search .ant-input-group-addon) {
  border-radius: 0 !important;
}

:deep(.ant-select-focused .ant-select-selector),
:deep(.ant-select-selector:hover),
:deep(.ant-input:hover),
:deep(.ant-input:focus) {
  border-radius: 0 !important;
}
</style>
