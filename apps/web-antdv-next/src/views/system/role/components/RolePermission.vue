<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';

import { computed, ref, watch } from 'vue';

import { $t } from '#/locales';

import {
  Divider,
  message,
  Modal,
  Spin,
  Tree,
} from 'antdv-next';

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
const treeData = ref<any[]>([]);
// 只存储叶子节点的选中状态
const selectedLeafIds = ref<Set<string>>(new Set());

// ==================== 方法 ====================

const loadData = async () => {
  if (!props.data?.id) return;

  try {
    loading.value = true;

    // 直接获取全部功能树
    const featureTree = await getAllFeatureTreeApi();
    treeData.value = formatFeatureTree(featureTree || []);

    // 获取角色权限
    const permissionRes = await getRolePermissionApi(props.data.id);
    if (permissionRes) {
      const featureIds = permissionRes.featureIds?.split(',').filter(Boolean) || [];
      selectedLeafIds.value = new Set(featureIds);
    }
  } catch (error) {
    console.error('加载权限数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const formatFeatureTree = (features: any[]): any[] => {
  return features.map((feature: any) => {
    const children = feature.children ? formatFeatureTree(feature.children) : undefined;
    return {
      id: feature.id,
      featureName: feature.featureName,
      children,
    };
  });
};

// 计算选中的 keys（叶子节点 + 有选中子节点的父节点）
const checkedKeys = computed(() => {
  const result = new Set<string>(selectedLeafIds.value);
  
  // 构建节点映射
  const allNodes = new Map<string, any>();
  const traverse = (nodes: any[], parentId?: string) => {
    for (const node of nodes) {
      allNodes.set(node.id, { ...node, parentId });
      if (node.children?.length) {
        traverse(node.children, node.id);
      }
    }
  };
  traverse(treeData.value);
  
  // 为每个选中的叶子节点添加父节点
  for (const leafId of selectedLeafIds.value) {
    let node = allNodes.get(leafId);
    while (node?.parentId) {
      result.add(node.parentId);
      node = allNodes.get(node.parentId);
    }
  }
  
  return Array.from(result);
});

// 获取节点下的所有叶子节点 ID
const getChildLeafIds = (node: any): string[] => {
  const leafIds: string[] = [];
  if (node.children?.length) {
    const traverse = (children: any[]) => {
      for (const child of children) {
        if (child.children?.length) {
          traverse(child.children);
        } else {
          leafIds.push(child.id);
        }
      }
    };
    traverse(node.children);
  } else {
    leafIds.push(node.id);
  }
  return leafIds;
};

// 处理选中变化
const handleCheck = (_keys: string[], info: { node: any; checked: boolean }) => {
  const { node, checked } = info;
  const nodeLeafIds = getChildLeafIds(node);
  
  if (checked) {
    nodeLeafIds.forEach(id => selectedLeafIds.value.add(id));
  } else {
    nodeLeafIds.forEach(id => selectedLeafIds.value.delete(id));
  }
};

const handleOk = async () => {
  if (selectedLeafIds.value.size === 0) {
    message.warning($t('system.role.selectAtLeastOne'));
    return;
  }

  try {
    okLoading.value = true;

    const featureIds = Array.from(selectedLeafIds.value).join(',');

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
  selectedLeafIds.value = new Set();
  treeData.value = [];
};

// ==================== 监听 ====================

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadData();
    }
  },
);
</script>

<template>
  <Modal
    :open="visible"
    :title="$t('system.role.permissionConfig')"
    :width="500"
    :confirm-loading="okLoading"
    class="system-modal-no-radius"
    @ok="handleOk"
    @cancel="handleClose"
  >
    <Divider/>
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
.system-modal-no-radius .ant-btn,
.system-modal-no-radius .ant-tree {
  border-radius: 0 !important;
}

.system-modal-no-radius.ant-modal,
.system-modal-no-radius .ant-modal-content {
  border-radius: 0 !important;
}
</style>
