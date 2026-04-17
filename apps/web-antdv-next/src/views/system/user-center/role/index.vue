<script lang="ts" setup>
import type { TreeProps } from 'antdv-next';

import type { OrgInfo } from '#/api/system/org';
import type { RoleInfo } from '#/api/system/role';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';

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
  App,
  Space,
  Tree,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrgTreeApi } from '#/api/system/org';
import { deleteRoleApi, getRolePageApi } from '#/api/system/role';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { $t } from '#/locales';

import { ROLE_PAGE_BUTTON_CODES } from './button-permissions';
import RoleForm from './components/RoleForm.vue';
import RolePermission from './components/RolePermission.vue';

defineOptions({ name: 'SystemRole' });
const { modal } = App.useApp();

const { canButton } = usePageButtonAccess();

// ==================== 状态定义 ====================

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

// 弹窗状态
const roleFormRef = ref<InstanceType<typeof RoleForm>>();

const rolePermissionRef = ref<InstanceType<typeof RolePermission>>();

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
      {
        field: 'roleName',
        title: $t('system.role.roleName'),
        minWidth: 150,
      },
      {
        field: 'deptName',
        title: $t('system.role.organization'),
        minWidth: 150,
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

function getFirstKey(data: OrgInfo[]): null | string {
  if (data.length === 0) return null;
  return data[0].id;
}

const handleSearch = () => {
  void gridApi.reload();
};

const handleReset = () => {
  searchForm.roleName = '';
  void gridApi.reload();
};

const handleDeptSelect: TreeProps['onSelect'] = (keys) => {
  if (keys.length > 0) {
    selectedKeys.value = keys as string[];
    selectedDeptId.value = keys[0] as string;
  }
};

const handleAdd = () => {
  roleFormRef.value?.open({ deptId: selectedDeptId.value });
};

const handleEdit = (record: RoleInfo) => {
  roleFormRef.value?.open({ id: record.id, record });
};

const handleDelete = async (record: RoleInfo) => {
  if (record.roleAlias === 'admin') {
    message.warning('管理员角色不能删除');
    return;
  }

  modal.confirm({
    title: $t('system.role.deleteTip'),
    content: $t('system.role.deleteContent'),
    okText: $t('system.common.ok'),
    cancelText: $t('system.common.cancel'),
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
      try {
        await deleteRoleApi(record.id);
        message.success($t('system.common.deleteSuccess'));
        void gridApi.reload();
      } catch (error: any) {
        message.error(error?.message || $t('system.common.deleteFailed'));
      }
    },
  });
};

const handlePermission = (record: RoleInfo) => {
  rolePermissionRef.value?.open({ record });
};

const handleFormSuccess = () => {
  void gridApi.reload();
};

const handlePermissionSuccess = () => {
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
  <Page auto-content-height>
    <div class="flex h-full gap-4">
      <!-- 左侧组织树 -->
      <Card class="w-80 shrink-0">
        <div class="mb-3">
          <InputSearch
            v-model:value="searchKey"
            :placeholder="$t('system.role.organizationPlaceholder')"
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
                <template #icon>
                  <IconifyIcon icon="lucide:rotate-ccw" />
                </template>
                {{ $t('system.common.reset') }}
              </Button>
            </Space>
          </div>
        </Card>

        <!-- 角色列表 -->
        <div class="min-h-0 flex-1">
          <Grid class="ant-card ant-card-bordered">
            <template #toolbar-actions>
              <div class="flex w-full items-center justify-between p-2">
                <div class="text-base font-bold">角色列表</div>
                <Button
                  v-if="canButton(ROLE_PAGE_BUTTON_CODES.add)"
                  type="primary"
                  class="w-21"
                  @click="handleAdd"
                >
                  <template #icon><IconifyIcon icon="lucide:plus" /></template>
                  {{ $t('system.common.add') }}
                </Button>
              </div>
            </template>

            <template #action="{ row }">
              <template v-if="row.roleAlias !== 'admin'">
                <Button
                  type="link"
                  size="small"
                  class="text-primary"
                  v-if="canButton(ROLE_PAGE_BUTTON_CODES.edit)"
                  @click="handleEdit(row)"
                >
                  {{ $t('system.common.edit') }}
                </Button>
                <Button
                  danger
                  type="link"
                  size="small"
                  v-if="canButton(ROLE_PAGE_BUTTON_CODES.delete)"
                  @click="handleDelete(row)"
                >
                  {{ $t('system.common.delete') }}
                </Button>
                <Button
                  type="link"
                  size="small"
                  v-if="canButton(ROLE_PAGE_BUTTON_CODES.auth)"
                  @click="handlePermission(row)"
                >
                  {{ $t('system.role.permission') }}
                </Button>
              </template>
            </template>
          </Grid>
        </div>
      </div>
    </div>

    <!-- 角色表单弹窗 -->
    <RoleForm
      ref="roleFormRef"
      @success="handleFormSuccess"
    />

    <!-- 权限配置弹窗 -->
    <RolePermission
      ref="rolePermissionRef"
      @success="handlePermissionSuccess"
    />
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
