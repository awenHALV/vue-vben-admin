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

/**
 * 过滤掉所有包含子节点的 Key，只保留叶子节点
 * @param keys 接口返回的所有 ID 数组
 * @param treeData 格式化后的树形数据
 */
function filterOnlyLeafKeys(
  keys: string[],
  treeData: TreeDataNode[],
): string[] {
  const leafKeys: string[] = [];

  // 建立一个简单的递归查找
  const findLeaf = (nodes: TreeDataNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        // 如果有子节点，递归进去
        findLeaf(node.children);
      } else {
        // 如果是叶子节点（没有子节点），且在接口返回的 keys 中，则记录
        if (keys.includes(node.key)) {
          leafKeys.push(node.key);
        }
      }
    });
  };

  findLeaf(treeData);
  return leafKeys;
}

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
      const allIdsFromApi = normalizeFeatureIds(rawFeatures) ?? [];
      // 【核心修改】不要直接赋值，先过滤掉父级 ID
      checkedKeys.value = filterOnlyLeafKeys(allIdsFromApi, treeData.value);
      // 可选：将那些在 allIdsFromApi 中但不在 checkedKeys 中的 ID 存入 halfCheckedKeys
      halfCheckedKeys.value = allIdsFromApi.filter(
        (id) => !checkedKeys.value.includes(id),
      );
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
      // 合并全选和半选的 ID
      const allSelectedIds = [...checkedKeys.value, ...halfCheckedKeys.value];
      // 去重并过滤空值
      const finalFeatureIds = [...new Set(allSelectedIds)].filter(
        (id) => id && String(id).trim(),
      );
      const appFeatureIds = finalFeatureIds.join(',');

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

// 定义一个变量存储半选状态
const halfCheckedKeys = ref<(number | string)[]>([]);

function updateCheckedKeys(keys: (number | string)[], infos: any) {
  checkedKeys.value = keys.map(String);
  halfCheckedKeys.value = infos.halfCheckedKeys;
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
          @check="(keys, infos) => updateCheckedKeys(keys, infos)"
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
