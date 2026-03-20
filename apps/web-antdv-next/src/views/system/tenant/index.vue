<script lang="ts" setup>
import type { BackendTenantItem, TenantPageParams } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getTenantPageApi } from '#/api/core/tenant';

import AddOrUpdate from './AddOrUpdate.vue';

defineOptions({ name: 'SystemTenant' });

const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);

/** 与菜单管理页一致的搜索条，条件通过 reload 传给 proxy */
const searchTenantName = ref('');
const searchTenantCode = ref('');

const statusLabel = computed(() => ({
  true: $t('tenant.status.enabled'),
  false: $t('tenant.status.disabled'),
}));

const [Grid, gridApi] = useVbenVxeGrid<BackendTenantItem>({
  /** 使用与菜单管理一致的自定义搜索区（见模板） */
  showSearchForm: false,
  separator: false,
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
      {
        field: 'id',
        title: $t('tenant.list.id'),
        minWidth: 160,
      },
      {
        field: 'tenantName',
        title: $t('tenant.list.tenantName'),
        minWidth: 180,
      },
      {
        field: 'companyName',
        title: $t('tenant.list.companyName'),
        minWidth: 100,
      },
      {
        field: 'creditCode',
        title: $t('tenant.list.creditCode'),
        minWidth: 100,
      },
      {
        field: 'adminAccount',
        title: $t('tenant.list.adminAccount'),
        minWidth: 100,
      },
      {
        field: 'adminName',
        title: $t('tenant.list.adminName'),
        minWidth: 100,
      },
      {
        field: 'adminPhone',
        title: $t('tenant.list.adminPhone'),
        minWidth: 100,
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

function getSearchPayload(): Partial<TenantPageParams> {
  const tenantName = searchTenantName.value.trim();
  const tenantCode = searchTenantCode.value.trim();
  const payload: Partial<TenantPageParams> = {};
  if (tenantName) {
    payload.tenantName = tenantName;
  }
  if (tenantCode) {
    payload.tenantCode = tenantCode;
  }
  return payload;
}

async function reloadTenantGrid() {
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadTenantGrid();
}

function handleReset() {
  searchTenantName.value = '';
  searchTenantCode.value = '';
  void reloadTenantGrid();
}

function openAdd() {
  addOrUpdateRef.value?.open();
}

function openEdit(record: BackendTenantItem) {
  addOrUpdateRef.value?.open(record);
}
</script>

<template>
  <Page
    :title="$t('tenant.title')"
    :auto-content-height="true"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域：与 system/menu 同一套布局与按钮样式 -->
    <div
      class="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto rounded-lg border border-border bg-background px-4 py-3 shadow-sm"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('tenant.list.tenantName')
          }}</span>
          <VbenInput
            v-model="searchTenantName"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('tenant.list.placeholderName')"
            @keydown.enter="handleSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('tenant.list.tenantCode')
          }}</span>
          <VbenInput
            v-model="searchTenantCode"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('tenant.list.placeholderCode')"
            @keydown.enter="handleSearch"
          />
        </div>
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
          <VbenButton class="w-[60px]" size="sm" @click="handleSearch">
            {{ $t('menu.action.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <Grid>
      <template #toolbar-actions>
        <div class="flex items-center justify-end gap-2">
          <VbenButton class="w-[84px]" size="sm" @click="openAdd">
            <Plus class="mr-1 size-4" />
            {{ $t('tenant.action.add') }}
          </VbenButton>
        </div>
      </template>

      <template #action="{ row }">
        <div class="flex-center gap-2">
          <VbenButton
            size="sm"
            variant="ghost"
            class="text-primary"
            @click="openEdit(row)"
          >
            {{ $t('tenant.action.edit') }}
          </VbenButton>
        </div>
      </template>
    </Grid>

    <AddOrUpdate ref="addOrUpdateRef" @success="reloadTenantGrid()" />
  </Page>
</template>
