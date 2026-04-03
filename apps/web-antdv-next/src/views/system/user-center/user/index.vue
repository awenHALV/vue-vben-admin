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

const userFormRef = ref<InstanceType<typeof UserForm>>();
const userDetailRef = ref<InstanceType<typeof UserDetail>>();
const userImportRef = ref<InstanceType<typeof UserImport>>();

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
  userFormRef.value?.open('add', { deptId: selectedDeptId.value });
};

const handleEdit = (record: UserInfo) => {
  userFormRef.value?.open('edit', { ...record });
};

const handleView = (record: UserInfo) => {
  userDetailRef.value?.open({ ...record });
};

const handlePasswordReset = (record: UserInfo) => {
  userFormRef.value?.open('passwordReset', {
    id: record.id,
    account: record.account,
  });
};

const handleImport = () => {
  userImportRef.value?.open();
};

const handleFormSuccess = () => {
  void gridApi.reload();
};

const handleImportSuccess = () => {
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
  <Page
    auto-content-height
    content-class="flex min-h-0 flex-1 flex-col"
  >
    <div
      class="user-split-grid h-full min-h-0 w-full min-w-0 flex-1 gap-4"
    >
      <!-- 左侧组织树：与右侧网格行同高，树超出时在内部滚动 -->
      <Card class="dept-tree-card min-h-0 w-full overflow-hidden">
        <div class="mb-3 shrink-0">
          <InputSearch
            v-model:value="searchKey"
            :placeholder="$t('system.org.orgNamePlaceholder')"
            allow-clear
          />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <Tree
            v-model:expanded-keys="expandedKeys"
            v-model:selected-keys="selectedKeys"
            :tree-data="filteredDeptTree"
            :field-names="{
              title: 'deptName',
              key: 'id',
              children: 'children',
            }"
            block-node
            @select="handleDeptSelect"
          />
        </div>
      </Card>

      <!-- 右侧：与左侧同一行网格等高 -->
      <div class="flex min-h-0 min-w-0 flex-col gap-4">
        <Card class="shrink-0">
          <div class="flex flex-col gap-4">
            <h2 class="text-lg/tight font-semibold text-foreground">
              {{ $t('system.user.title') }}
            </h2>
            <div
              class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3"
            >
              <div class="min-w-0 flex-1">
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
              </div>
              <Space class="shrink-0">
                <Button
                  class="w-21"
                  type="primary"
                  @click="handleSearch"
                >
                  <template #icon>
                    <IconifyIcon icon="lucide:search" />
                  </template>
                  {{ $t('system.common.search') }}
                </Button>
                <Button
                  class="w-21"
                  @click="handleReset"
                >
                  <template #icon>
                    <IconifyIcon icon="lucide:rotate-ccw" />
                  </template>
                  {{ $t('system.common.reset') }}
                </Button>
              </Space>
            </div>
          </div>
        </Card>

        <!-- 用户列表 -->
        <div class="user-grid-host min-h-0 flex-1">
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
    <UserForm ref="userFormRef" @success="handleFormSuccess" />

    <!-- 用户详情弹窗 -->
    <UserDetail ref="userDetailRef" />

    <!-- 用户导入弹窗 -->
    <UserImport
      ref="userImportRef"
      @success="handleImportSuccess"
    />
  </Page>
</template>

<style scoped>
/* 两列占满内容区高度且等高；避免纯 flex 下子项高度.percent 无法解析导致左侧偏矮 */
.user-split-grid {
  display: grid;
  grid-template-columns: 18rem minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

/* 左侧 Card 铺满网格单元，内部纵向 flex + 树区滚动 */
.dept-tree-card {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.dept-tree-card :deep(.ant-card-body) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}
</style>

<style>
/* Grid 填满容器高度 - 分页固定在底部 */
.user-grid-host > div:has(.vxe-grid) {
  height: 100%;
}

.user-grid-host .vxe-grid {
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

.user-grid-host .vxe-grid--main-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.user-grid-host .vxe-table--main-wrapper {
  flex: 1;
}

.user-grid-host .vxe-table--body-wrapper {
  flex: 1;
  overflow-y: auto;
}
</style>
