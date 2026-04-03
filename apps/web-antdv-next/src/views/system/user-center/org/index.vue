<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { OrgInfo } from '#/api/system/org';

import { ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';

import { message, Modal, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteOrgApi, getOrgTreeApi } from '#/api/system/org';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { $t } from '#/locales';

import { ORG_PAGE_BUTTON_CODES } from './button-permissions';
import OrgForm from './components/OrgForm.vue';

const { canButton } = usePageButtonAccess();

const loading = ref(false);
const tableData = ref<OrgInfo[]>([]);

const searchForm = ref({
  deptName: '',
});

const orgFormRef = ref<InstanceType<typeof OrgForm> | null>(null);

const [Grid, gridApi] = useVbenVxeGrid<OrgInfo>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: { isHover: true, keyField: 'id', height: 46 },
    checkboxConfig: {
      highlight: true,
      range: false,
      checkStrictly: true,
    },
    treeConfig: {
      childrenField: 'children',
      rowField: 'id',
      transform: false,
      padding: true,
      // 配置自定义展开/收起图标
      iconOpen: 'vxe-icon-square-minus',
      iconClose: 'vxe-icon-square-plus',
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          loading.value = true;
          try {
            const res = await getOrgTreeApi(searchForm.value);
            tableData.value = res || [];
            return {
              records: tableData.value,
              total: tableData.value.length,
            };
          } finally {
            loading.value = false;
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
        field: 'deptName',
        title: $t('system.org.orgName'),
        treeNode: true,
        width: 200,
      },
      {
        field: 'remark',
        title: $t('system.common.remarks'),
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

const getTableData = async () => {
  await gridApi.query();
};

const handleSearch = () => {
  getTableData();
};

const handleReset = () => {
  searchForm.value.deptName = '';
  getTableData();
};

const handleEdit = (record: OrgInfo) => {
  orgFormRef.value?.open('edit', record, '');
};

const handleAddChild = (record: OrgInfo) => {
  orgFormRef.value?.open(
    'addChild',
    {
      parentId: record.id,
      parentInternal: record.internal ?? '',
    },
    '',
  );
};

const handleDelete = async (record: OrgInfo) => {
  if (record.parentId === '0' || !record.parentId) {
    message.warning($t('system.org.rootCannotDelete'));
    return;
  }

  Modal.confirm({
    title: $t('system.org.deleteTip'),
    content: $t('system.org.deleteContent'),
    okText: $t('system.common.ok'),
    cancelText: $t('system.common.cancel'),
    onOk: async () => {
      try {
        await deleteOrgApi([record.id]);
        message.success($t('system.common.deleteSuccess'));
        getTableData();
      } catch (error: any) {
        message.error(error?.message || $t('system.common.deleteFailed'));
      }
    },
  });
};

const handleFormSuccess = () => {
  getTableData();
};
</script>

<template>
  <Page
    auto-content-height
    :title="$t('system.org.title')"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域 -->
    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background p-6"
    >
      <div class="flex items-center gap-2">
        <span class="shrink-0 text-sm text-muted-foreground">{{
          $t('system.org.orgName')
        }}</span>
        <VbenInput
          v-model="searchForm.deptName"
          class="w-56 [&_input]:h-8"
          :placeholder="$t('system.org.orgNamePlaceholder')"
          @keydown.enter="handleSearch"
        />
      </div>
      <div class="ml-auto flex shrink-0 items-center justify-end">
        <Space>
          <VbenButton
            class="w-[60px]"
            size="sm"
            variant="outline"
            @click="handleReset"
          >
            {{ $t('menu.action.reset') }}
          </VbenButton>
          <!-- eslint-disable-next-line prettier/prettier -- 与 vue/max-attributes-per-line 每属性单行一致 -->
          <VbenButton
            class="w-[60px]"
            size="sm"
            @click="handleSearch"
          >
            {{ $t('menu.action.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <!-- 组织列表 -->
    <Grid>
      <template #action="{ row }">
        <Space size="small">
          <VbenButton
            v-if="canButton(ORG_PAGE_BUTTON_CODES.edit)"
            size="sm"
            variant="ghost"
            @click="handleEdit(row)"
          >
            <span class="text-primary">{{ $t('system.common.edit') }}</span>
          </VbenButton>
          <VbenButton
            v-if="canButton(ORG_PAGE_BUTTON_CODES.delete)"
            size="sm"
            variant="ghost"
            :disabled="!row.parentId || row.parentId === '0'"
            @click="handleDelete(row)"
          >
            <span class="text-destructive">{{
              $t('system.common.delete')
            }}</span>
          </VbenButton>
          <VbenButton
            v-if="canButton(ORG_PAGE_BUTTON_CODES.addSub)"
            size="sm"
            variant="ghost"
            @click="handleAddChild(row)"
          >
            <span class="text-primary">{{ $t('system.org.addSubitem') }}</span>
          </VbenButton>
        </Space>
      </template>
    </Grid>

    <!-- 组织表单弹窗 -->
    <!-- eslint-disable-next-line prettier/prettier -- 与 vue/max-attributes-per-line 每属性单行一致 -->
    <OrgForm
      ref="orgFormRef"
      @success="handleFormSuccess"
    />
  </Page>
</template>

<style scoped>
/* 默认 .vxe-tree-cell { padding-left: 1.5em }，收窄后展开/收起图标更贴近文字 */
.org-vxe-grid :deep(.vxe-tree-cell) {
  padding-left: 0.25rem;
}
</style>
