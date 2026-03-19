<script lang="ts" setup>
import type { DeptTreeNode, UserInfo } from '#/api/system/user';

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
  Space,
  Table,
  Tag,
  Tree,
} from 'antdv-next';
import type { TableColumnsType, TreeProps } from 'antdv-next';

import {
  getDeptTreeApi,
  getUserPageApi,
} from '#/api/system/user';
import UserDetail from './components/UserDetail.vue';
import UserForm from './components/UserForm.vue';
import UserImport from './components/UserImport.vue';

// ==================== 状态定义 ====================

const loading = ref(false);
const tableData = ref<UserInfo[]>([]);
const selectedDeptId = ref<string>('');

// 部门树相关
const deptTreeData = ref<DeptTreeNode[]>([]);
const searchKey = ref('');
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 搜索表单
const searchForm = reactive({
  account: '',
  name: '',
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
const userFormVisible = ref(false);
const userFormType = ref<'add' | 'edit' | 'passwordReset'>('add');
const userFormData = ref<Partial<UserInfo>>({});

const userDetailVisible = ref(false);
const userDetailData = ref<Partial<UserInfo>>({});

const userImportVisible = ref(false);

// ==================== 计算属性 ====================

const filteredDeptTree = computed(() => {
  if (!searchKey.value) return deptTreeData.value;
  return filterTree(deptTreeData.value, searchKey.value.toLowerCase());
});

const columns: TableColumnsType = [
  {
    title: $t('system.user.num') || '序号',
    dataIndex: 'index',
    width: 60,
  },
  {
    title: $t('system.user.account'),
    dataIndex: 'account',
    width: 120,
    align: 'center',
  },
  {
    title: $t('system.user.name'),
    dataIndex: 'name',
    width: 100,
    align: 'center',
  },
  {
    title: $t('system.user.role'),
    dataIndex: 'roleName',
    width: 180,
    align: 'left',
  },
  {
    title: $t('system.user.org'),
    dataIndex: 'deptName',
    width: 150,
    align: 'left',
  },
  {
    title: $t('system.common.status'),
    dataIndex: 'status',
    width: 80,
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

function filterTree(data: DeptTreeNode[], keyword: string): DeptTreeNode[] {
  const result: DeptTreeNode[] = [];
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
    const res = await getDeptTreeApi();
    deptTreeData.value = res || [];
    // 默认展开所有节点
    const allKeys = getAllKeys(deptTreeData.value);
    expandedKeys.value = allKeys;
    // 默认选中第一个
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

function getAllKeys(data: DeptTreeNode[]): string[] {
  const keys: string[] = [];
  for (const item of data) {
    keys.push(item.id);
    if (item.children?.length) {
      keys.push(...getAllKeys(item.children));
    }
  }
  return keys;
}

function getFirstKey(data: DeptTreeNode[]): string | null {
  if (data.length === 0) return null;
  return data[0].id;
}

const getUserList = async () => {
  if (!selectedDeptId.value) return;
  try {
    loading.value = true;
    const res = await getUserPageApi({
      current: pagination.current,
      size: pagination.pageSize,
      deptId: selectedDeptId.value,
      ...searchForm,
    });
    tableData.value = res?.records || [];
    pagination.total = res?.total || 0;
  } catch (error) {
    console.error('获取用户列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  getUserList();
};

const handleReset = () => {
  searchForm.account = '';
  searchForm.name = '';
  pagination.current = 1;
  getUserList();
};

const handleTableChange = (pag: any) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  getUserList();
};

const handleDeptSelect: TreeProps['onSelect'] = (keys) => {
  if (keys.length > 0) {
    selectedKeys.value = keys as string[];
    selectedDeptId.value = keys[0] as string;
  }
};

// 操作按钮
const handleAdd = () => {
  userFormType.value = 'add';
  userFormData.value = { deptId: selectedDeptId.value };
  userFormVisible.value = true;
};

const handleEdit = (record: UserInfo) => {
  userFormType.value = 'edit';
  userFormData.value = { ...record };
  userFormVisible.value = true;
};

const handleView = (record: UserInfo) => {
  userDetailData.value = { ...record };
  console.log('handleView', userDetailData.value)
  userDetailVisible.value = true;
};

const handlePasswordReset = (record: UserInfo) => {
  userFormType.value = 'passwordReset';
  userFormData.value = { id: record.id, account: record.account };
  userFormVisible.value = true;
};

const handleImport = () => {
  userImportVisible.value = true;
};

const handleFormSuccess = () => {
  userFormVisible.value = false;
  getUserList();
};

const handleImportSuccess = () => {
  userImportVisible.value = false;
  getUserList();
};

// ==================== 生命周期 ====================

onMounted(() => {
  getDeptTree();
});

watch(selectedDeptId, () => {
  pagination.current = 1;
  getUserList();
});
</script>

<template>
  <Page auto-content-height>
    <Card class="h-full">
      <div class="flex h-full">
        <!-- 左侧部门树 -->
        <div class="w-80 flex-shrink-0 pr-4">
          <div class="mb-3">
            <InputSearch
              v-model:value="searchKey"
              :placeholder="$t('system.org.orgNamePlaceholder')"
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
        </div>

        <!-- 分割线 -->
        <div class="w-px bg-border mr-4 flex-shrink-0"></div>

        <!-- 右侧内容区 -->
        <div class="flex-1 flex flex-col min-w-0">
          <div class="mb-4">
            <h1 class="text-lg font-medium">{{ $t('system.user.title') }}</h1>
          </div>
          <!-- 搜索表单 -->
          <div class="pb-4 mb-4 border-b border-border">
            <Form layout="inline">
              <FormItem :label="$t('system.user.account')">
                <Input
                  v-model:value="searchForm.account"
                  :placeholder="$t('system.user.accountPlaceholder')"
                  allow-clear
                  style="width: 240px"
                />
              </FormItem>
              <FormItem :label="$t('system.user.name')">
                <Input
                  v-model:value="searchForm.name"
                  :placeholder="$t('system.user.namePlaceholder')"
                  allow-clear
                  style="width: 240px"
                />
              </FormItem>
              <FormItem>
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
              </FormItem>
            </Form>
          </div>

          <!-- 操作按钮 -->
          <div class="mb-4">
            <Space>
              <Button type="primary" class="w-21" @click="handleAdd">
                <template #icon><IconifyIcon icon="lucide:plus" /></template>
                {{ $t('system.common.add') }}
              </Button>
              <Button class="w-24" @click="handleImport">
                <template #icon><IconifyIcon icon="lucide:upload" /></template>
                {{ $t('system.user.batchImport') }}
              </Button>
            </Space>
          </div>

          <!-- 用户列表 -->
          <div class="flex-1 min-h-0">
            <Table
              :columns="columns"
              :data-source="tableData"
              :loading="loading"
              :pagination="pagination"
              :scroll="{ x: 900 }"
              row-key="id"
              size="middle"
              @change="handleTableChange"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.dataIndex === 'index'">
                  {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
                </template>
                <template v-else-if="column.dataIndex === 'status'">
                  <Tag :color="record.status === 1 ? 'success' : 'error'">
                    {{ record.status === 1 ? $t('system.common.normal') : $t('system.common.disabled') }}
                  </Tag>
                </template>
                <template v-else-if="column.dataIndex === 'roleName'">
                  <template v-if="record.roleName">
                    <Tag
                      v-for="(role, idx) in record.roleName.split(',')"
                      :key="idx"
                      color="blue"
                    >
                      {{ role }}
                    </Tag>
                  </template>
                </template>
                <template v-else-if="column.key === 'action'">
                  <Space>
                    <a @click="handleView(record)">{{ $t('system.common.view') }}</a>
                    <a @click="handleEdit(record)">{{ $t('system.common.edit') }}</a>
                    <a @click="handlePasswordReset(record)">{{ $t('system.user.resetPassword') }}</a>
                  </Space>
                </template>
              </template>
            </Table>
          </div>
        </div>
      </div>
    </Card>

    <!-- 用户表单弹窗 -->
    <UserForm
      v-model:visible="userFormVisible"
      :type="userFormType"
      :data="userFormData"
      @success="handleFormSuccess"
    />

    <!-- 用户详情弹窗 -->
    <UserDetail
      v-model:visible="userDetailVisible"
      :data="userDetailData"
    />

    <!-- 用户导入弹窗 -->
    <UserImport
      v-model:visible="userImportVisible"
      @success="handleImportSuccess"
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
