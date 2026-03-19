<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';
import type { DescriptionsItemType } from 'antdv-next';

import { computed, h } from 'vue';

import { $t } from '#/locales';

import { Descriptions, Modal, Tag } from 'antdv-next';

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
  data?: Partial<UserInfo>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  data: () => ({}),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

// ==================== 计算属性 ====================

const detailItems = computed<DescriptionsItemType[]>(() => {
  if (!props.data) return [];
  const renderStatus = (status: number) => {
    return h(Tag, { color: status === 1 ? 'green' : 'red' }, () =>
      status === 1 ? $t('system.common.normal') : $t('system.common.disabled')
    );
  };

  const renderRoles = (roles: string) => {
    if (!roles) return '-';
    return roles.split(',').map((role, idx) =>
      h(Tag, { key: idx, color: 'blue' }, () => role)
    );
  };

  return [
    { label: $t('system.user.account'), content: props.data.account || '-' },
    { label: $t('system.user.name'), content: props.data.name || '-' },
    { label: $t('system.common.status'), content: renderStatus(props.data.status ?? 1) },
    { label: $t('system.user.phone'), content: props.data.phone || '-' },
    { label: $t('system.user.email'), content: props.data.email || '-' },
    { label: $t('system.user.org'), content: props.data.deptName || '-' },
    { label: $t('system.user.role'), content: renderRoles(props.data.roleName || '') },
  ];
});

// ==================== 方法 ====================

const handleClose = () => {
  emit('update:visible', false);
};
</script>

<template>
  <Modal
    :open="visible"
    :title="$t('system.user.userDetails')"
    :width="700"
    :footer="null"
    class="system-modal-no-radius"
    @cancel="handleClose"
  >
    <Descriptions :column="2" bordered :items="detailItems" />
  </Modal>
</template>

<style>
.system-modal-no-radius .ant-btn,
.system-modal-no-radius .ant-tag {
  border-radius: 0 !important;
}

.system-modal-no-radius.ant-modal,
.system-modal-no-radius .ant-modal-content {
  border-radius: 0 !important;
}

.system-modal-no-radius .ant-descriptions-bordered {
  border-radius: 0 !important;
}
</style>
