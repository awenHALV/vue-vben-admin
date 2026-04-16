<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { DictOption } from '#/api/system/dict';
import type { OrgInfo } from '#/api/system/org';
import type { AssetItem, TradeEntityListItem } from '#/api/system/trade-entity';

import { ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useDebounceFn } from '@vueuse/core';
import { Checkbox, InputSearch, message, Spin, Tag } from 'antdv-next';

import { getDictOptionsApi } from '#/api/system/dict';
import {
  createTradeEntityApi,
  getDeptAssetsApi,
  getTradeEntityListApi,
} from '#/api/system/trade-entity';
import { $t } from '#/locales';

defineOptions({ name: 'EntityConfigModal' });

withDefaults(defineProps<Props>(), {
  deptId: '',
  orgName: '',
});

const emit = defineEmits<{
  success: [];
}>();

interface Props {
  deptId?: string;
  orgName?: string;
}

const loading = ref(false);
const entityList = ref<TradeEntityListItem[]>([]);
const selectedAssets = ref<AssetItem[]>([]);
const searchKeyword = ref('');
const currentDeptId = ref('');
const entityTypeOptions = ref<DictOption[]>([]);

async function loadEntityList() {
  if (!currentDeptId.value) {
    entityList.value = [];
    return;
  }

  loading.value = true;
  try {
    const res = await getTradeEntityListApi({
      name: searchKeyword.value || undefined,
    });
    entityList.value = res.filter((item) => item.entityType !== '3') || [];
  } finally {
    loading.value = false;
  }
}

async function loadEntityTypeOptions() {
  try {
    entityTypeOptions.value = await getDictOptionsApi(
      'entity_trade_entity_type',
    );
  } catch (error) {
    console.error('Failed to load entity type options:', error);
  }
}

async function loadDeptAssets() {
  if (!currentDeptId.value) return;
  try {
    const res = await getDeptAssetsApi(currentDeptId.value);
    selectedAssets.value = res || [];
  } catch (error) {
    console.error('Failed to load department assets:', error);
  }
}

const debouncedSearch = useDebounceFn(loadEntityList, 500);

watch(searchKeyword, () => {
  debouncedSearch();
});

function getEntityTypeLabel(value?: string) {
  const option = entityTypeOptions.value.find(
    (opt) => opt.optionKey === (value ?? ''),
  );
  return option ? option.optionValue : (value ?? '');
}

function handleSearch() {
  loadEntityList();
}

function handleCheckOne(entity: TradeEntityListItem, checked: boolean) {
  if (checked) {
    if (!selectedAssets.value.some((item) => item.assetId === entity.id)) {
      selectedAssets.value.push({
        assetId: entity.id,
        // 暂时没有场站的概念，先用交易主体
        assetType: 'TRADING_SUBJECT',
      });
    }
  } else {
    selectedAssets.value = selectedAssets.value.filter(
      (item) => item.assetId !== entity.id,
    );
  }
}

function handleRowClick(entity: TradeEntityListItem) {
  const isSelected = selectedAssets.value.some(
    (item) => item.assetId === entity.id,
  );
  if (isSelected) {
    selectedAssets.value = selectedAssets.value.filter(
      (item) => item.assetId !== entity.id,
    );
  } else {
    selectedAssets.value.push({
      assetId: entity.id,
      // 暂时没有场站的概念，先用交易主体
      assetType: 'TRADING_SUBJECT',
    });
  }
}

const handleEntitySaved = async (assets: AssetItem[]) => {
  if (!currentDeptId.value) {
    return;
  }
  modalApi.lock(true);
  try {
    await createTradeEntityApi({
      deptId: currentDeptId.value,
      assets,
    });
    emit('success');
    modalApi.close();
    message.success($t('system.org.configSuccess'));
  } catch {
    // 请求层已统一错误提示
  } finally {
    modalApi.unlock();
  }
};

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  title: $t('system.tradeEntity.assetConfig'),
  closeOnClickModal: false,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: $t('common.cancel'),
  confirmText: $t('common.confirm'),
  onOpenChange: async (open: boolean) => {
    if (!open) return;
    searchKeyword.value = '';
    selectedAssets.value = [];
    await Promise.all([
      loadEntityTypeOptions(),
      loadEntityList(),
      loadDeptAssets(),
    ]);
  },
  async onConfirm() {
    await handleEntitySaved(selectedAssets.value);
  },
});

function open(record: OrgInfo) {
  const { id } = record;
  currentDeptId.value = id || '';
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <div class="flex h-full flex-col overflow-hidden p-3">
      <!-- 搜索区域 -->
      <div class="mb-4 w-full">
        <InputSearch
          v-model:value="searchKeyword"
          class="w-full"
          :placeholder="$t('system.tradeEntity.namePlaceholder')"
          @search="handleSearch"
        />
      </div>

      <!-- 列表区域 -->
      <div
        class="flex max-h-[400px] flex-col overflow-y-auto rounded-lg border border-border"
        style="border-color: #e4e4e7"
      >
        <div class="p-5">
          <div v-if="loading" class="flex-center py-10">
            <Spin />
          </div>
          <div
            v-else-if="entityList.length === 0"
            class="py-12 text-center text-gray-400"
          >
            {{ $t('system.tradeEntity.noData') }}
          </div>
          <div v-else>
            <div class="flex flex-col gap-2">
              <div
                v-for="entity in entityList"
                :key="entity.id"
                class="flex h-10 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-gray-50"
                @click="handleRowClick(entity)"
              >
                <Checkbox
                  :checked="
                    selectedAssets.some((item) => item.assetId === entity.id)
                  "
                  @change="handleCheckOne(entity, $event.target.checked)"
                  @click.stop
                />
                <span class="text-sm text-gray-700">
                  {{ entity.name }}
                </span>
                <Tag
                  :bordered="true"
                  class="mr-0! box-border bg-white! text-gray-500!"
                  style="border-color: #e4e4e7; border-radius: 4px"
                >
                  {{ getEntityTypeLabel(entity.entityType) }}
                </Tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #prepend-footer>
      <div class="flex-1 text-sm text-gray-500">
        {{ $t('system.tradeEntity.selectedLabel', '已选择') }}
        <span class="mx-1 font-medium text-primary">{{
          selectedAssets.length
        }}</span>
        {{ $t('system.tradeEntity.countLabel', '个资产节点') }}
      </div>
    </template>
  </VbenModal>
</template>
