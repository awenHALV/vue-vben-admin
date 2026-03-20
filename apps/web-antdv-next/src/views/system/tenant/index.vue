<script lang="ts" setup>
import type { BackendTenantItem, TenantPageParams } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { Page, VbenButton } from '@vben/common-ui';
import { Plus, Trash2 } from '@vben/icons';
import { $t } from '@vben/locales';

import { message, Modal } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteTenantApi,
  deleteTenantApi,
  getTenantPageApi,
} from '#/api/core/tenant';

import AddOrUpdate from './AddOrUpdate.vue';

defineOptions({ name: 'SystemTenant' });

const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);

function openAdd() {
  addOrUpdateRef.value?.open();
}

function openEdit(record: BackendTenantItem) {
  addOrUpdateRef.value?.open(record);
}

async function handleDelete(record: BackendTenantItem) {
  Modal.confirm({
    title: $t('tenant.action.delete'),
    content: $t('tenant.message.deleteConfirm', { 0: record.tenantName }),
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteTenantApi(record.id);
        message.success($t('tenant.message.deleted', { 0: record.tenantName }));
        await gridApi.reload();
      } catch {
        message.error($t('tenant.message.deleteFailed'));
      }
    },
  });
}

async function handleBatchDelete() {
  const records =
    (await gridApi.grid.getCheckboxRecords()) as BackendTenantItem[];
  if (records.length === 0) {
    message.warning($t('tenant.message.selectFirst'));
    return;
  }

  Modal.confirm({
    title: $t('tenant.action.batchDelete'),
    content: $t('tenant.message.batchDeleteConfirm', { 0: records.length }),
    okType: 'danger',
    onOk: async () => {
      try {
        await batchDeleteTenantApi(records.map((r) => r.id));
        message.success($t('tenant.message.batchDeleteSuccess'));
        await gridApi.reload();
      } catch {
        message.error($t('tenant.message.deleteFailed'));
      }
    },
  });
}

const statusLabel = computed(() => ({
  true: $t('tenant.status.enabled'),
  false: $t('tenant.status.disabled'),
}));

const [Grid, gridApi] = useVbenVxeGrid<BackendTenantItem>({
  tableTitle: $t('tenant.title'),
  showSearchForm: true,
  formOptions: {
    schema: [
      {
        component: 'VbenInput',
        fieldName: 'tenantName',
        label: $t('tenant.list.tenantName'),
        componentProps: {
          placeholder: $t('tenant.list.placeholderName'),
        },
      },
      {
        component: 'VbenInput',
        fieldName: 'tenantCode',
        label: $t('tenant.list.tenantCode'),
        componentProps: {
          placeholder: $t('tenant.list.placeholderCode'),
        },
      },
    ],
  },
  gridOptions: {
    height: 'auto',
    rowConfig: { isHover: true },
    checkboxConfig: { highlight: true, range: true },
    proxyConfig: {
      ajax: {
        query: async ({ page, form }: any) => {
          const params: TenantPageParams = {
            current: page?.currentPage,
            size: page?.pageSize,
          };
          if (form) {
            Object.assign(params, form);
          }
          return await getTenantPageApi(params);
        },
      },
    },
    columns: [
      { type: 'checkbox', width: 44, fixed: 'left' },
      {
        field: 'tenantCode',
        title: $t('tenant.list.tenantCode'),
        minWidth: 160,
      },
      {
        field: 'tenantName',
        title: $t('tenant.list.tenantName'),
        minWidth: 180,
      },
      {
        field: 'tenantNameEn',
        title: $t('tenant.list.tenantNameEn'),
        minWidth: 180,
        showOverflow: true,
      },
      {
        field: 'contact',
        title: $t('tenant.list.contact'),
        minWidth: 140,
      },
      {
        field: 'phone',
        title: $t('tenant.list.phone'),
        minWidth: 140,
      },
      {
        field: 'status',
        title: $t('tenant.list.status'),
        width: 110,
        align: 'center',
        formatter: ({ cellValue }: any) => {
          const enabled = Boolean(cellValue ?? true);
          return enabled ? statusLabel.value.true : statusLabel.value.false;
        },
      },
      {
        title: $t('tenant.list.action'),
        width: 210,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});
</script>

<template>
  <Page :auto-content-height="true" content-class="flex flex-col gap-3 p-4">
    <Grid>
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <VbenButton @click="openAdd">
            <Plus class="mr-1 size-4" />
            {{ $t('tenant.action.add') }}
          </VbenButton>
          <VbenButton variant="destructive" @click="handleBatchDelete">
            <Trash2 class="mr-1 size-4" />
            {{ $t('tenant.action.batchDelete') }}
          </VbenButton>
        </div>
      </template>

      <template #action="{ row }">
        <div class="flex-center gap-2">
          <VbenButton size="sm" variant="ghost" @click="openEdit(row)">
            {{ $t('tenant.action.edit') }}
          </VbenButton>
          <VbenButton
            size="sm"
            variant="ghost"
            class="text-destructive"
            @click="handleDelete(row)"
          >
            {{ $t('tenant.action.delete') }}
          </VbenButton>
        </div>
      </template>
    </Grid>

    <AddOrUpdate ref="addOrUpdateRef" @success="gridApi.reload()" />
  </Page>
</template>
