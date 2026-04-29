<script lang="ts" setup>
import type { ConsultationInfo, ConsultationPageParams } from '#/api/operation/consultation';

import { ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { CircleX } from '@vben/icons';
import { $t } from '#/locales';

import { Space } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getConsultationPageApi } from '#/api/operation/consultation';

defineOptions({ name: 'ConsultationManagement' });

/** 搜索条件 */
const searchName = ref('');
const searchPhone = ref('');
const searchCompany = ref('');

const [Grid, gridApi] = useVbenVxeGrid<ConsultationInfo>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: {
      isHover: true,
    },
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any, mergedForm: any) => {
          const params: ConsultationPageParams = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
          };
          if (mergedForm && typeof mergedForm === 'object') {
            Object.assign(params, mergedForm);
          }
          return await getConsultationPageApi(params);
        },
      },
    },
    columns: [
      {
        field: 'contactName',
        title: $t('operation.consultation.name'),
        minWidth: 120,
      },
      {
        field: 'contactPhone',
        title: $t('operation.consultation.phone'),
        minWidth: 140,
      },
      {
        field: 'companyName',
        title: $t('operation.consultation.company'),
        minWidth: 200,
      },
      {
        field: 'requirementDescription',
        title: $t('operation.consultation.description'),
        minWidth: 300,
        showOverflow: false,
        align: 'left',
        className: 'requirement-description-cell',
      },
      {
        field: 'sourceType',
        title: $t('operation.consultation.sourceType'),
        minWidth: 120,
      },
      {
        field: 'updateTime',
        title: $t('operation.consultation.createTime'),
        minWidth: 180,
        slots: { default: 'createTime' },
      },
    ],
  },
});

function getSearchPayload(): Partial<ConsultationPageParams> {
  const contactName = searchName.value.trim();
  const contactPhone = searchPhone.value.trim();
  const companyName = searchCompany.value.trim();
  const payload: Partial<ConsultationPageParams> = {};
  if (contactName) {
    payload.contactName = contactName;
  }
  if (contactPhone) {
    payload.contactPhone = contactPhone;
  }
  if (companyName) {
    payload.companyName = companyName;
  }
  return payload;
}

async function reloadGrid() {
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadGrid();
}

function handleReset() {
  searchName.value = '';
  searchPhone.value = '';
  searchCompany.value = '';
  void reloadGrid();
}

/** 清除搜索框内容 */
function clearSearchName() {
  searchName.value = '';
  void reloadGrid();
}

function clearSearchPhone() {
  searchPhone.value = '';
  void reloadGrid();
}

function clearSearchCompany() {
  searchCompany.value = '';
  void reloadGrid();
}
</script>

<template>
  <Page
    :title="$t('operation.consultation.title')"
    :auto-content-height="true"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域 -->
    <div
      class="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto rounded-lg border border-border bg-background p-6"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <!-- 姓名 -->
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">
            {{ $t('operation.consultation.name') }}
          </span>
          <VbenInput
            v-model="searchName"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('operation.consultation.namePlaceholder')"
            @keydown.enter="handleSearch"
          >
            <template #suffix>
              <CircleX
                v-if="searchName"
                class="mr-2 size-4 cursor-pointer text-muted-foreground hover:text-foreground"
                @click="clearSearchName"
              />
            </template>
          </VbenInput>
        </div>
        <!-- 电话 -->
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">
            {{ $t('operation.consultation.phone') }}
          </span>
          <VbenInput
            v-model="searchPhone"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('operation.consultation.phonePlaceholder')"
            @keydown.enter="handleSearch"
          >
            <template #suffix>
              <CircleX
                v-if="searchPhone"
                class="mr-2 size-4 cursor-pointer text-muted-foreground hover:text-foreground"
                @click="clearSearchPhone"
              />
            </template>
          </VbenInput>
        </div>
        <!-- 公司 -->
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">
            {{ $t('operation.consultation.company') }}
          </span>
          <VbenInput
            v-model="searchCompany"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('operation.consultation.companyPlaceholder')"
            @keydown.enter="handleSearch"
          >
            <template #suffix>
              <CircleX
                v-if="searchCompany"
                class="mr-2 size-4 cursor-pointer text-muted-foreground hover:text-foreground"
                @click="clearSearchCompany"
              />
            </template>
          </VbenInput>
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
            {{ $t('common.reset') }}
          </VbenButton>
          <VbenButton
            class="w-[60px]"
            size="sm"
            @click="handleSearch"
          >
            {{ $t('common.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <!-- 表格 -->
    <Grid>
      <template #createTime="{ row }">
        {{ row.updateTime ? dayjs(row.updateTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
/* 需求描述列自动换行 */
:deep(.vxe-body--column.requirement-description-cell),
:deep(.vxe-body--column.requirement-description-cell .vxe-cell),
:deep(.vxe-body--column.requirement-description-cell .vxe-cell__content) {
  white-space: normal !important;
  word-break: break-all !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
/* 让表格行高自适应 */
:deep(.vxe-body--row) {
  height: auto !important;
}
</style>
