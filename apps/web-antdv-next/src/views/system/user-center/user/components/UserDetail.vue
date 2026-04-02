<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';
import type { DescriptionsItemType } from 'antdv-next';

import { computed } from 'vue';

import { $t } from '#/locales';

import {Descriptions, Divider, Modal} from 'antdv-next';

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
    return status === 1 ? $t('system.common.normal') : $t('system.common.disabled');
  };

  const renderRoles = (roles: string) => {
    if (!roles) return '-';
    return roles.split(',').join('、');
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
    @cancel="handleClose"
    @ok="handleClose"
  >
    <Divider/>
    <Descriptions :column="1" bordered :items="detailItems" />
  </Modal>
</template>

<style>
/* 使用系统设置的圆角（通过 --radius CSS 变量） */
</style>
