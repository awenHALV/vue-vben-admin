<script lang="ts" setup>
import type { RoleInfo, FeatureInfo } from '#/api/system/role';

import { computed, ref, watch } from 'vue';

import { $t } from '#/locales';

import { Divider, message, Modal, Spin, Tree } from 'antdv-next';

import {
  getAllFeatureTreeApi,
  getRolePermissionApi,
  saveRolePermissionApi,
} from '#/api/system/role';

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
  data?: Partial<RoleInfo>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  data: () => ({}),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// ==================== 状态定义 ====================

const loading = ref(false);
const okLoading = ref(false);
const treeData = ref<FeatureInfo[]>([]);
const selectedIds = ref<Set<string>>(new Set());

const nodeMap = computed(() => {
  const map = new Map<string, FeatureInfo & { parentId?: string }>();
  const traverse = (nodes: FeatureInfo[], parentId?: string) => {
    for (const node of nodes) {
      map.set(node.id, { ...node, parentId });
      if (node.children?.length) {
        traverse(node.children, node.id);
      }
    }
  };
  traverse(treeData.value);
  return map;
});

const getAllParentIds = (nodeId: string): string[] => {
  const result: string[] = [];
  let node = nodeMap.value.get(nodeId);
  while (node?.parentId) {
    result.push(node.parentId);
    node = nodeMap.value.get(node.parentId);
  }
  return result;
};

const getAllChildIds = (nodeId: string): string[] => {
  const result: string[] = [];
  const node = nodeMap.value.get(nodeId);
  if (node?.children?.length) {
    const traverse = (children: FeatureInfo[]) => {
      for (const child of children) {
        result.push(child.id);
        if (child.children?.length) {
          traverse(child.children);
        }
      }
    };
    traverse(node.children);
  }
  return result;
};

const hasSelectedDescendant = (nodeId: string): boolean => {
  const node = nodeMap.value.get(nodeId);
  if (!node?.children?.length) return false;
  for (const child of node.children) {
    if (selectedIds.value.has(child.id)) return true;
    if (hasSelectedDescendant(child.id)) return true;
  }
  return false;
};

const checkedKeys = computed(() => {
  const result = new Set<string>(selectedIds.value);
  for (const [id, node] of nodeMap.value) {
    if (hasSelectedDescendant(id)) {
      result.add(id);
    }
  }
  return Array.from(result);
});

const loadData = async () => {
  if (!props.data?.id) return;
  try {
    loading.value = true;
    const featureTree = await getAllFeatureTreeApi();
    treeData.value = featureTree || [];
    const permissionRes = await getRolePermissionApi(props.data.id);
    if (permissionRes?.featureIds) {
      const featureIds = permissionRes.featureIds.split(',').filter(Boolean);
      selectedIds.value = new Set(featureIds);
    } else {
      selectedIds.value = new Set();
    }
  } catch (error) {
    console.error('加载权限数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleCheck = (_keys: string[], info: { node: any; checked: boolean }) => {
  const { node, checked } = info;
  const nodeId = node.id;
  const featureType = node.featureType;
  const hasChildren = node.children?.length > 0;

  if (checked) {
    // 选中操作
    if (featureType === 'BUTTON') {
      selectedIds.value.add(nodeId);
      const parentIds = getAllParentIds(nodeId);
      parentIds.forEach((pid) => selectedIds.value.add(pid));
    } else {
      selectedIds.value.add(nodeId);
      if (hasChildren) {
        const childIds = getAllChildIds(nodeId);
        childIds.forEach((id) => selectedIds.value.add(id));
      }
    }
  } else {
    // 取消操作
    selectedIds.value.delete(nodeId);

    if (featureType === 'BUTTON') {
      // 取消按钮：不级联取消父菜单
    } else {
      // 取消菜单：取消子节点并级联检查祖先
      if (hasChildren) {
        const childIds = getAllChildIds(nodeId);
        childIds.forEach((id) => selectedIds.value.delete(id));
      }

      let currentId = nodeId;
      let currentNode = nodeMap.value.get(currentId);
      while (currentNode?.parentId) {
        const parentId = currentNode.parentId;
        const parentNode = nodeMap.value.get(parentId);
        if (!parentNode) break;

        const hasOtherSelected =
          parentNode.children?.some((child: FeatureInfo) => {
            if (child.id === currentId) return false;
            if (selectedIds.value.has(child.id)) return true;
            return hasSelectedDescendant(child.id);
          }) ?? false;

        if (!hasOtherSelected) {
          selectedIds.value.delete(parentId);
        }

        currentId = parentId;
        currentNode = parentNode;
      }
    }
  }
};

const handleOk = async () => {
  if (checkedKeys.value.length === 0) {
    message.warning($t('system.role.selectAtLeastOne'));
    return;
  }
  try {
    okLoading.value = true;
    const featureIds = checkedKeys.value.join(',');
    await saveRolePermissionApi({
      roleId: props.data?.id || '',
      featureIds,
    });
    message.success($t('system.role.configSuccess'));
    emit('success');
    handleClose();
  } catch (error: any) {
    message.error(error?.message || '保存失败');
  } finally {
    okLoading.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  selectedIds.value = new Set();
  treeData.value = [];
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadData();
    }
  }
);
</script>

<template>
  <Modal
    :open="visible"
    :title="$t('system.role.permissionConfig')"
    :width="500"
    :confirm-loading="okLoading"
    @ok="handleOk"
    @cancel="handleClose"
  >
    <Divider />
    <Spin :spinning="loading">
      <Tree
        :checked-keys="checkedKeys"
        :tree-data="treeData"
        :field-names="{ title: 'featureName', key: 'id', children: 'children' }"
        checkable
        block-node
        :height="400"
        class="overflow-auto"
        :check-strictly="true"
        @check="handleCheck"
      />
    </Spin>
  </Modal>
</template>

<style>
/* 使用系统设置的圆角（通过 --radius CSS 变量） */
</style>
