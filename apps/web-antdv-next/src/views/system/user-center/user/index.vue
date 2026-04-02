<script lang="ts" setup>
import type { TreeProps } from 'antdv-next';

import type { DeptTreeNode, UserInfo } from '#/api/system/user';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

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
  Tag,
  Tree,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteUserApi, getDeptTreeApi, getUserPageApi } from '#/api/system/user';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { $t } from '#/locales';

import { USER_PAGE_BUTTON_CODES } from './button-permissions';
import UserDetail from './components/UserDetail.vue';
import UserForm from './components/UserForm.vue';
import UserImport from './components/UserImport.vue';

const { canButton } = usePageButtonAccess();

// ==================== 状态定义 ====================

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
      {
        type: 'seq',
        title: $t('system.user.num') || '序号',
        width: 60,
      },
      {
        field: 'account',
        title: $t('system.user.account'),
        minWidth: 120,
      },
      {
        field: 'name',
        title: $t('system.user.name'),
        minWidth: 100,
      },
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
      const children = filterTree(item.children, keyword);
      if (children.length > 0) {
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

function getFirstKey(data: DeptTreeNode[]): null | string {
  if (data.length === 0) return null;
  return data[0].id;
}

const handleSearch = () => {
  void gridApi.reload();
};

const handleReset = () => {
  searchForm.account = '';
  searchForm.name = '';
  void gridApi.reload();
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
  console.log('handleView', userDetailData.value);
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
  void gridApi.reload();
};

const handleImportSuccess = () => {
  userImportVisible.value = false;
  void gridApi.reload();
};

const handleDelete = (record: UserInfo) => {
  Modal.confirm({
    title: $t('system.user.confirmDelete'),
    content: $t('system.user.confirmDeleteMessage', { name: record.name }),
    okText: $t('system.common.ok'),
    cancelText: $t('system.common.cancel'),
    onOk: async () => {
      try {
        await deleteUserApi([record.id]);
        message.success($t('system.common.deleteSuccess'));
        void gridApi.reload();
      } catch (error) {
        console.error('删除用户失败:', error);
        message.error($t('system.common.deleteFailed'));
      }
    },
  });
};

// ==================== 生命周期 ====================

onMounted(() => {
  getDeptTree();
});

watch(selectedDeptId, () => {
  void gridApi.reload();
});
</script>

<template>
  <Page auto-content-height :title="$t('system.user.title')">
    <div class="flex h-full gap-4">
      <!-- 左侧部门树 -->
      <Card class="w-80 shrink-0">
        <div class="mb-3">
          <InputSearch
            v-model:value="searchKey"
            :placeholder="$t('system.org.orgNamePlaceholder')"
            allow-clear
          />
        </div>
        <Tree
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          :tree-data="filteredDeptTree"
          :field-names="{ title: 'deptName', key: 'id', children: 'children' }"
          block-node
          class="h-[calc(100%-60px)]"
          @select="handleDeptSelect"
        />
      </Card>

      <!-- 右侧内容区 -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <!-- 搜索表单 -->
        <Card>
          <div class="flex items-start justify-between">
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
            </Form>
            <Space>
              <Button type="primary" class="w-21" @click="handleSearch">
                <template #icon><IconifyIcon icon="lucide:search" /></template>
                {{ $t('system.common.search') }}
              </Button>
              <Button class="w-21" @click="handleReset">
                <template #icon>
                  <IconifyIcon icon="lucide:rotate-ccw" />
                </template>
                {{ $t('system.common.reset') }}
              </Button>
            </Space>
          </div>
        </Card>

        <!-- 用户列表 -->
        <div class="min-h-0 flex-1">
          <Grid>
            <template #toolbar-actions>
              <div class="flex w-full justify-end">
                <Space>
                  <Button
                    v-if="canButton(USER_PAGE_BUTTON_CODES.add)"
                    type="primary"
                    class="w-21"
                    @click="handleAdd"
                  >
                    <template #icon>
                      <IconifyIcon icon="lucide:plus" />
                    </template>
                    {{ $t('system.common.add') }}
                  </Button>
                  <Button
                    v-if="canButton(USER_PAGE_BUTTON_CODES.batchImport)"
                    class="w-26"
                    @click="handleImport"
                  >
                    <template #icon>
                      <IconifyIcon icon="lucide:upload" />
                    </template>
                    {{ $t('system.user.batchImport') }}
                  </Button>
                </Space>
              </div>
            </template>

            <template #roleName="{ row }">
              <template v-if="row.roleName">
                <Tag v-for="(role, idx) in row.roleName.split(',')" :key="idx" color="blue">
                  {{ role }}
                </Tag>
              </template>
            </template>

            <template #action="{ row }">
              <Space>
                <a v-if="canButton(USER_PAGE_BUTTON_CODES.detail)" @click="handleView(row)">{{
                  $t('system.common.view')
                }}</a>
                <a v-if="canButton(USER_PAGE_BUTTON_CODES.edit)" @click="handleEdit(row)">{{
                  $t('system.common.edit')
                }}</a>
                <a
                  v-if="canButton(USER_PAGE_BUTTON_CODES.resetPwd)"
                  @click="handlePasswordReset(row)"
                  >{{ $t('system.user.editPassword') }}</a
                >
                <a
                  v-if="canButton(USER_PAGE_BUTTON_CODES.delete)"
                  class="text-error"
                  @click="handleDelete(row)"
                  >{{ $t('system.common.delete') }}</a
                >
              </Space>
            </template>
          </Grid>
        </div>
      </div>
    </div>

    <!-- 用户表单弹窗 -->
    <UserForm
      v-model:visible="userFormVisible"
      :type="userFormType"
      :data="userFormData"
      @success="handleFormSuccess"
    />

    <!-- 用户详情弹窗 -->
    <UserDetail v-model:visible="userDetailVisible" :data="userDetailData" />

    <!-- 用户导入弹窗 -->
    <UserImport v-model:visible="userImportVisible" @success="handleImportSuccess" />
  </Page>
</template>

<style scoped>
/* 使用系统设置的圆角 */
</style>

<style>
/* Grid 填满容器高度 - 分页固定在底部 */
.flex-1.min-h-0 > div:has(.vxe-grid) {
  height: 100%;
}

.flex-1.min-h-0 .vxe-grid {
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

.flex-1.min-h-0 .vxe-grid--main-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.flex-1.min-h-0 .vxe-table--main-wrapper {
  flex: 1;
}

.flex-1.min-h-0 .vxe-table--body-wrapper {
  flex: 1;
  overflow-y: auto;
}
</style>
