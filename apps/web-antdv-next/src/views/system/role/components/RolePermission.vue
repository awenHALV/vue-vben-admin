<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';

import { ref, watch } from 'vue';

import { $t } from '#/locales';

import {
  Button, Divider,
  message,
  Modal,
  Spin,
  Tree,
} from 'antdv-next';

import {
  getAppListApi,
  getAppFeatureTreeApi,
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
const checkedKeys = ref<string[]>([]);

// ==================== 方法 ====================

const loadData = async () => {
  if (!props.data?.id) return;

  try {
    loading.value = true;

    // 获取应用列表
    const appRes = await getAppListApi();
    const apps = appRes?.records || [];

    // 获取每个应用的功能树
    const featurePromises = apps.map((app: any) => getAppFeatureTreeApi(app.id));
    const featureResults = await Promise.all(featurePromises);

    // 组装树数据
    treeData.value = apps.map((app: any, index: number) => ({
      id: `${app.id}appIds`,
      appName: app.appName,
      appNameEn: app.appNameEn,
      children: formatFeatureTree(featureResults[index] || []),
    }));

    // 获取角色权限
    const permissionRes = await getRolePermissionApi(props.data.id);
    if (permissionRes) {
      const appIds = permissionRes.appIds?.split(',').map((id: string) => `${id}appIds`) || [];
      const featureIds = permissionRes.featureIds?.split(',') || [];
      checkedKeys.value = [...appIds, ...featureIds];
    }
  } catch (error) {
    console.error('加载权限数据失败:', error);
  } finally {
    loading.value = false;
  }
};

const formatFeatureTree = (features: any[]): any[] => {
  return features.map((feature: any) => ({
    id: feature.id,
    appName: feature.featureName,
    appNameEn: feature.featureNameEn,
    children: feature.children ? formatFeatureTree(feature.children) : [],
  }));
};

const handleOk = async () => {
  if (checkedKeys.value.length === 0) {
    message.warning($t('system.role.selectAtLeastOne'));
    return;
  }

  try {
    okLoading.value = true;
   console.log('checkedKeys', checkedKeys.value);
    // 分离 appIds 和 featureIds
    const appIds = checkedKeys.value
      .filter((key) => key.endsWith('appIds'))
      .map((key) => key.replace('appIds', ''))
      .join(',');

    const featureIds = checkedKeys.value
      .filter((key) => !key.endsWith('appIds'))
      .join(',');

    await saveRolePermissionApi({
      roleId: props.data?.id || '',
      appIds,
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
  checkedKeys.value = [];
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
        v-model:checkedKeys="checkedKeys"
        :tree-data="treeData"
        :field-names="{ title: 'appName', key: 'id', children: 'children' }"
        checkable
        block-node
        :height="400"
        class="overflow-auto"
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
