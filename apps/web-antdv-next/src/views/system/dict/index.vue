<script lang="ts" setup>
import type { DictListItem, DictPageParams } from '#/api/core/dict';

import { ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { Button, message, Modal, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteDictApi, getDictPageApi } from '#/api/core/dict';
import { usePageButtonAccess } from '#/composables/use-page-button-access';

import AddOrUpdate from './AddOrUpdate.vue';
import { DICT_PAGE_BUTTON_CODES } from './button-permissions';
import DictConfigModal from './DictConfigModal.vue';

defineOptions({ name: 'SystemDict' });

const { canButton } = usePageButtonAccess();

const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);
const dictConfigModalRef = ref<InstanceType<typeof DictConfigModal> | null>(
  null,
);

/** 与菜单管理页一致的搜索条，条件通过 reload 传给 proxy */
const searchDictName = ref('');
const searchDictCode = ref('');

const [Grid, gridApi] = useVbenVxeGrid<DictListItem>({
  /** 使用与菜单管理一致的自定义搜索区（见模板） */
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 'auto',
    rowConfig: {
      isHover: true,
      height: 46,
    },
    checkboxConfig: { highlight: true, range: true },
    proxyConfig: {
      ajax: {
        /**
         * Vben 对 query 做了包装：第一个参数为 vxe 的 proxy 参数（含 page），
         * 第二个参数为 `reload(传入对象)` 与内置搜索表单 `getLatestSubmissionValues()` 的合并结果。
         * 本页自定义搜索区通过 `gridApi.reload(getSearchPayload())` 传参，必须在第二参数里合并。
         */
        query: async (proxyParams: any, mergedForm: any) => {
          const params: DictPageParams = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
          };
          if (mergedForm && typeof mergedForm === 'object') {
            Object.assign(params, mergedForm);
          }
          return await getDictPageApi(params);
        },
      },
    },
    columns: [
      {
        field: 'dictName',
        title: $t('dict.list.dictName'),
        minWidth: 180,
      },
      {
        field: 'dictCode',
        title: $t('dict.list.dictCode'),
        minWidth: 100,
      },
      {
        field: 'remark',
        title: $t('dict.list.remark'),
        minWidth: 100,
      },
      {
        title: $t('dict.list.action'),
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});

function getSearchPayload(): Partial<DictPageParams> {
  const dictName = searchDictName.value.trim();
  const dictCode = searchDictCode.value.trim();
  const payload: Partial<DictPageParams> = {};
  if (dictName) {
    payload.dictName = dictName;
  }
  if (dictCode) {
    payload.dictCode = dictCode;
  }
  return payload;
}

async function reloadDictGrid() {
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadDictGrid();
}

function handleReset() {
  searchDictName.value = '';
  searchDictCode.value = '';
  void reloadDictGrid();
}

function openAdd() {
  addOrUpdateRef.value?.open();
}

function openEdit(record: DictListItem) {
  addOrUpdateRef.value?.open(record);
}

function openDelete(record: DictListItem) {
  Modal.confirm({
    title: $t('dict.list.deleteConfirm', [record.dictName]),
    content: $t('dict.list.deleteContent'),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    onOk: async () => {
      await deleteDictApi([record.id]);
      message.success($t('dict.list.batchDeleteSuccess', [record.dictName]));
      void reloadDictGrid();
    },
  });
}

function openDictConfig(record: DictListItem) {
  dictConfigModalRef.value?.open(record);
}
</script>

<template>
  <Page
    :title="$t('dict.title')"
    :auto-content-height="true"
    content-class="flex flex-col gap-3 p-4"
  >
    <!-- 搜索区域：与 system/menu 同一套布局与按钮样式 -->
    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background p-6"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('dict.list.dictName')
          }}</span>
          <VbenInput
            v-model="searchDictName"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('dict.placeholder.dictName')"
            @keydown.enter="handleSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('dict.list.dictCode')
          }}</span>
          <VbenInput
            v-model="searchDictCode"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('dict.placeholder.dictCode')"
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
          <!-- prettier-ignore -->
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

    <Grid>
      <template #toolbar-actions>
        <div class="flex w-full items-center justify-end gap-2">
          <!-- prettier-ignore -->
          <VbenButton
            v-if="canButton(DICT_PAGE_BUTTON_CODES.add)"
            class="w-[84px]"
            size="sm"
            @click="openAdd"
          >
            <Plus class="mr-1 size-4" />
            {{ $t('dict.list.add') }}
          </VbenButton>
        </div>
      </template>

      <template #action="{ row }">
        <Button
          v-if="canButton(DICT_PAGE_BUTTON_CODES.edit)"
          type="link"
          size="small"
          class="text-primary"
          @click="openEdit(row)"
        >
          {{ $t('dict.list.edit') }}
        </Button>
        <Button
          danger
          v-if="canButton(DICT_PAGE_BUTTON_CODES.delete)"
          type="link"
          size="small"
          @click="openDelete(row)"
        >
          {{ $t('dict.list.delete') }}
        </Button>
        <Button
          v-if="canButton(DICT_PAGE_BUTTON_CODES.dictConfig)"
          type="link"
          size="small"
          class="text-primary"
          @click="openDictConfig(row)"
        >
          {{ $t('dict.list.dictConfig') }}
        </Button>
      </template>
    </Grid>

    <!-- prettier-ignore -->
    <AddOrUpdate
      ref="addOrUpdateRef"
      @success="reloadDictGrid()"
    />

    <DictConfigModal ref="dictConfigModalRef" />
  </Page>
</template>
