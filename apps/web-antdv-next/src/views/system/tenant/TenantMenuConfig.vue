<script lang="ts" setup>
import type { AppFeatureTreeNode } from '#/api/core/menu';
import type { BackendTenantItem, UpdateConfigParams } from '#/api/core/tenant';

import { defineAsyncComponent, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { message, Spin } from 'antdv-next';

import {
  getMineFeaturesRawApi,
  mapBackendMenusToFeatureTree,
} from '#/api/core/menu';
import { getTenantDetailApi, updateConfigApi } from '#/api/core/tenant';

defineOptions({ name: 'TenantMenuConfig' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const Tree = defineAsyncComponent(() => import('antdv-next/dist/tree/index'));

const loading = ref(false);
const treeData = ref<TreeDataNode[]>([]);
const checkedKeys = ref<string[]>([]);
const currentRow = ref<BackendTenantItem | null>(null);
const detailRef = ref<BackendTenantItem | null>(null);

function normalizeFeatureIds(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    return v
      .map((x) => (x === null || x === undefined ? '' : String(x).trim()))
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => (x === null || x === undefined ? '' : String(x).trim()))
          .filter(Boolean);
      }
    } catch {
      /* 非 JSON 时按逗号分隔 */
    }
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

interface TreeDataNode {
  children?: TreeDataNode[];
  key: string;
  title: string;
}

function mapNodesToTreeData(nodes: AppFeatureTreeNode[]): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.value,
    title: n.title,
    children: n.children?.length ? mapNodesToTreeData(n.children) : undefined,
  }));
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: $t('common.cancel'),
  confirmText: $t('common.confirm'),
  title: $t('tenant.modal.menuConfig'),
  class: 'w-[min(100%,560px)]',
  contentClass: 'px-1',
  async onOpenChange(open) {
    if (!open) {
      currentRow.value = null;
      detailRef.value = null;
      treeData.value = [];
      checkedKeys.value = [];
      return;
    }
    const row = currentRow.value;
    if (!row?.id) {
      return;
    }
    loading.value = true;
    detailRef.value = null;
    treeData.value = [];
    checkedKeys.value = [];
    try {
      const [rawMenus, detail] = await Promise.all([
        getMineFeaturesRawApi(),
        getTenantDetailApi(row.id),
      ]);
      detailRef.value = detail;
      const tree = mapBackendMenusToFeatureTree(rawMenus, {
        t: $t,
        useEnglishName: preferences.app.locale === 'en-US',
      });
      treeData.value = mapNodesToTreeData(tree);
      const rawFeatures = detail.featureIds;
      checkedKeys.value = normalizeFeatureIds(rawFeatures) ?? [];
      await nextTick();
    } catch {
      message.error($t('tenant.message.detailFailed'));
      modalApi.close();
    } finally {
      loading.value = false;
    }
  },
  async onConfirm() {
    const detail = detailRef.value;
    const row = currentRow.value;
    if (!detail || !row?.id) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const featureIds = Array.isArray(checkedKeys.value)
        ? checkedKeys.value.filter(
            (id) => id !== null && id !== undefined && String(id).trim(),
          )
        : [];
      const appFeatureIds = featureIds.map(String).join(',');

      const createBody: UpdateConfigParams = {
        tenantId: row.tenantId,
        featureIds: appFeatureIds,
      };

      await updateConfigApi(createBody satisfies UpdateConfigParams);

      message.success($t('tenant.message.menuConfigSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record: BackendTenantItem) {
  currentRow.value = record;
  modalApi.open();
}

function updateCheckedKeys(keys: (number | string)[]) {
  checkedKeys.value = keys.map(String);
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Spin :spinning="loading">
      <div class="max-h-[min(60vh,420px)] overflow-y-auto">
        <Tree
          v-if="treeData.length > 0"
          :checked-keys="checkedKeys"
          block-node
          checkable
          default-expand-all
          :tree-data="treeData"
          @update:checked-keys="updateCheckedKeys"
        />
        <div
          v-else-if="!loading"
          class="py-6 text-center text-sm text-muted-foreground"
        >
          {{ $t('tenant.message.menuConfigEmptyTree') }}
        </div>
      </div>
    </Spin>
  </VbenModal>
</template>
