<script lang="ts" setup>
import type {
  DictListItem,
  DictOptionItem,
  DictOptionPageParams,
} from '#/api/core/dict';

import { h, nextTick, ref } from 'vue';

import { useVbenModal, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon, Plus, Trash2 } from '@vben/icons';
import { $t } from '@vben/locales';

import { App, message, Modal } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  batchDeleteDictOptionApi,
  getDictOptionPageApi,
} from '#/api/core/dict';

import DictOptionAddOrUpdate from './DictOptionAddOrUpdate.vue';

defineOptions({ name: 'DictConfigModal' });
const { modal } = App.useApp();

const dictIdRef = ref<null | number | string>(null);
/** 列表行未带 dictCode 时用于展示父级字典编码 */
const parentDictCode = ref('');
const searchOptionKey = ref('');
const searchOptionValue = ref('');
const optionFormRef = ref<InstanceType<typeof DictOptionAddOrUpdate> | null>(
  null,
);

const [Grid, gridApi] = useVbenVxeGrid<DictOptionItem>({
  showSearchForm: false,
  separator: false,
  gridOptions: {
    height: 360,
    rowConfig: { isHover: true },
    checkboxConfig: { highlight: true, range: true },
    pagerConfig: {},
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any, mergedForm: any) => {
          const id = dictIdRef.value;
          if (id === null) {
            return { items: [], total: 0 };
          }
          const params: DictOptionPageParams = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
          };
          if (mergedForm && typeof mergedForm === 'object') {
            Object.assign(params, mergedForm);
          }
          return await getDictOptionPageApi(id, params);
        },
      },
    },
    columns: [
      { type: 'checkbox', width: 48, align: 'center' },
      {
        type: 'seq',
        title: $t('dict.config.seq'),
        width: 64,
        align: 'center',
      },
      {
        field: 'dictCode',
        title: $t('dict.list.dictCode'),
        minWidth: 160,
        formatter: ({
          cellValue,
          row,
        }: {
          cellValue: unknown;
          row: DictOptionItem;
        }) => String(cellValue ?? row.dictCode ?? parentDictCode.value ?? ''),
      },
      {
        field: 'optionKey',
        title: $t('dict.config.optionKey'),
        minWidth: 100,
      },
      {
        field: 'optionValue',
        title: $t('dict.config.optionValue'),
        minWidth: 100,
      },
      {
        field: 'optionValueEn',
        title: $t('dict.config.optionValueEn'),
        minWidth: 140,
      },
      {
        title: $t('dict.list.action'),
        width: 140,
        fixed: 'right',
        align: 'center',
        showOverflow: false,
        slots: { default: 'action' },
      },
    ],
  },
});

function getSearchPayload(): Partial<DictOptionPageParams> {
  const payload: Partial<DictOptionPageParams> = {};
  const dc = searchOptionKey.value.trim();
  const ov = searchOptionValue.value.trim();
  if (dc) payload.optionKey = dc;
  if (ov) payload.optionValue = ov;
  return payload;
}

/**
 * 弹窗 destroyOnClose 时，Grid 的 onMounted（挂载 gridApi）晚于 modal 的 onOpenChange，
 * 需在 commitProxy 可用后再 query/reload，否则会报 commitProxy is not a function。
 */
async function waitForGridReady(maxAttempts = 40): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (typeof gridApi.grid?.commitProxy === 'function') {
      return true;
    }
    await nextTick();
    if (i % 2 === 1) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
  }
  return false;
}

async function reloadGrid() {
  const ready = await waitForGridReady();
  if (!ready) {
    return;
  }
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadGrid();
}

function handleReset() {
  searchOptionKey.value = '';
  searchOptionValue.value = '';
  void reloadGrid();
}

function openAddOption() {
  const id = dictIdRef.value;
  if (id === null) return;
  optionFormRef.value?.open(id, undefined, parentDictCode.value);
}

function openEditOption(row: DictOptionItem) {
  const id = dictIdRef.value;
  if (id === null) return;
  optionFormRef.value?.open(id, row, parentDictCode.value);
}

function openDeleteOption(row: DictOptionItem) {
  const dictId = dictIdRef.value;
  if (dictId === null) return;
  modal.confirm({
    title: $t('dict.config.deleteOneConfirm', [
      row.optionValue || row.optionKey,
    ]),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
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
      await batchDeleteDictOptionApi(dictId, [row.id]);
      message.success($t('dict.config.deleteSuccess'));
      void reloadGrid();
    },
  });
}

function handleBatchDelete() {
  const dictId = dictIdRef.value;
  if (dictId === null) return;
  const grid = gridApi.grid;
  const selected = grid?.getCheckboxRecords
    ? (grid.getCheckboxRecords() as DictOptionItem[])
    : [];
  if (selected.length === 0) {
    message.warning($t('dict.config.batchDeleteEmpty'));
    return;
  }
  Modal.confirm({
    title: $t('dict.config.batchDeleteConfirm', [String(selected.length)]),
    okType: 'danger',
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
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
      await batchDeleteDictOptionApi(
        dictId,
        selected.map((r) => r.id),
      );
      message.success($t('dict.config.batchDeleteSuccess'));
      void reloadGrid();
    },
  });
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showCancelButton: false,
  showConfirmButton: false,
  cancelText: $t('common.cancel'),
  confirmText: $t('common.confirm'),
  title: $t('dict.config.title'),
  class: 'w-[min(100%,1000px)]',
  contentClass: 'flex max-h-[min(80vh,720px)] flex-col gap-3 p-4',
  async onOpenChange(open) {
    if (!open) {
      dictIdRef.value = null;
      parentDictCode.value = '';
      searchOptionKey.value = '';
      searchOptionValue.value = '';
      return;
    }
    await nextTick();
    await reloadGrid();
  },
  onConfirm() {
    modalApi.close();
  },
});

function open(record: DictListItem) {
  dictIdRef.value = record.id;
  parentDictCode.value = record.dictCode ?? '';
  searchOptionKey.value = '';
  searchOptionValue.value = '';
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <!-- prettier-ignore -->
    <div
      class="flex w-full flex-nowrap items-center justify-between gap-6 overflow-x-auto border-b border-border pb-3"
    >
      <div
        class="flex min-w-0 flex-1 flex-nowrap items-center gap-x-8 gap-y-2"
      >
      <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm whitespace-nowrap text-foreground">
            {{ $t('dict.config.searchOptionKey') }}
          </span>
          <VbenInput
            v-model="searchOptionKey"
            class="w-56 shrink-0 [&_input]:h-8"
            :placeholder="$t('ui.placeholder.input')"
            @keydown.enter="handleSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm whitespace-nowrap text-foreground">
            {{ $t('dict.config.searchOptionValue') }}
          </span>
          <VbenInput
            v-model="searchOptionValue"
            class="w-56 shrink-0 [&_input]:h-8"
            :placeholder="$t('ui.placeholder.input')"
            @keydown.enter="handleSearch"
          />
        </div>
      </div>
      <div
        class="flex shrink-0 items-center gap-2"
      >
        <VbenButton
          class="min-w-[60px]"
          size="sm"
          variant="outline"
          @click="handleReset"
        >
          {{ $t('menu.action.reset') }}
        </VbenButton>
        <!-- prettier-ignore -->
        <VbenButton
          class="min-w-[60px]"
          size="sm"
          @click="handleSearch"
        >
          {{ $t('menu.action.search') }}
        </VbenButton>
      </div>
    </div>

    <Grid>
      <template #toolbar-actions>
        <div class="flex w-full items-center justify-end gap-2">
          <!-- prettier-ignore -->
          <VbenButton
            class="min-w-[84px]"
            size="sm"
            @click="openAddOption"
          >
            <Plus class="mr-1 size-4" />
            {{ $t('dict.list.add') }}
          </VbenButton>
          <VbenButton
            class="min-w-[84px] border-destructive text-destructive hover:bg-destructive/10"
            size="sm"
            variant="outline"
            @click="handleBatchDelete"
          >
            <Trash2 class="mr-1 size-4" />
            {{ $t('dict.list.delete') }}
          </VbenButton>
        </div>
      </template>

      <template #action="{ row }">
        <div class="flex-center gap-2">
          <VbenButton
            size="sm"
            variant="ghost"
            class="text-primary"
            @click="openEditOption(row)"
          >
            {{ $t('dict.list.edit') }}
          </VbenButton>
          <VbenButton
            size="sm"
            variant="ghost"
            class="text-destructive"
            @click="openDeleteOption(row)"
          >
            {{ $t('dict.list.delete') }}
          </VbenButton>
        </div>
      </template>
    </Grid>
  </VbenModal>

  <!-- prettier-ignore -->
  <DictOptionAddOrUpdate
    ref="optionFormRef"
    @success="reloadGrid"
  />
</template>
