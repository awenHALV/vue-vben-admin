<script lang="ts" setup>
import type { DescriptionsItemType } from 'antdv-next';

import type { UserInfo } from '#/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Descriptions } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'UserDetail' });

const detailData = ref<Partial<UserInfo>>({});
const statusOptions = ref<any[]>([]);

const detailItems = computed<DescriptionsItemType[]>(() => {
  const data = detailData.value;
  if (!data || Object.keys(data).length === 0) {
    return [];
  }
  const renderStatus = (status: number) => {
    const opt = statusOptions.value.find((o) => o.optionKey === String(status));
    return opt ? opt.optionValue : String(status);
  };

  const renderRoles = (roles: string) => {
    if (!roles) {
      return '-';
    }
    return roles.split(',').join('、');
  };

  return [
    { label: $t('system.user.account'), content: data.account || '-' },
    { label: $t('system.user.name'), content: data.name || '-' },
    {
      label: $t('system.common.status'),
      content: renderStatus(data.status ?? 1),
    },
    { label: $t('system.user.phone'), content: data.phone || '-' },
    { label: $t('system.user.email'), content: data.email || '-' },
    { label: $t('system.user.org'), content: data.deptName || '-' },
    {
      label: $t('system.user.role'),
      content: renderRoles(data.roleName || ''),
    },
  ];
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  title: $t('system.user.userDetails'),
  class: 'w-[min(100%,700px)]',
  onOpenChange(open: boolean) {
    if (!open) {
      detailData.value = {};
    }
  },
  onConfirm() {
    modalApi.close();
  },
  onCancel() {
    modalApi.close();
  },
});

function open(data: Partial<UserInfo>, options: any[] = []) {
  detailData.value = { ...data };
  statusOptions.value = options;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <!-- eslint-disable-next-line prettier/prettier -- 与 vue/max-attributes-per-line 每属性单行一致 -->
    <Descriptions
      :column="1"
      bordered
      :items="detailItems"
    />
  </VbenModal>
</template>
