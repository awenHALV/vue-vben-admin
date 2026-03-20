<script lang="ts" setup>
import type { BackendTenantItem, CreateTenantParams } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { $t } from '@vben/locales';
import { useVbenModal, z } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';

import { createTenantApi, updateTenantApi } from '#/api/core/tenant';

defineOptions({ name: 'TenantAddOrUpdate' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<BackendTenantItem | null>(null);

const modalTitle = computed(() =>
  isEdit.value ? $t('tenant.action.edit') : $t('tenant.action.add'),
);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 110,
  },
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('placeholder.input', { 0: $t('tenant.form.tenantCode') }),
      },
      fieldName: 'tenantCode',
      label: $t('tenant.form.tenantCode'),
      rules: z
        .string()
        .min(1, $t('formRules.required', { 0: $t('tenant.form.tenantCode') })),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('placeholder.input', { 0: $t('tenant.form.tenantName') }),
      },
      fieldName: 'tenantName',
      label: $t('tenant.form.tenantName'),
      rules: z
        .string()
        .min(1, $t('formRules.required', { 0: $t('tenant.form.tenantName') })),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('placeholder.input', {
          0: $t('tenant.form.tenantNameEn'),
        }),
      },
      fieldName: 'tenantNameEn',
      label: $t('tenant.form.tenantNameEn'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('placeholder.input', { 0: $t('tenant.form.contact') }),
      },
      fieldName: 'contact',
      label: $t('tenant.form.contact'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('placeholder.input', { 0: $t('tenant.form.phone') }),
      },
      fieldName: 'phone',
      label: $t('tenant.form.phone'),
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: $t('placeholder.input', { 0: $t('tenant.form.remark') }),
        rows: 3,
      },
      fieldName: 'remark',
      label: $t('tenant.form.remark'),
    },
    {
      component: 'Switch',
      componentProps: {},
      defaultValue: true,
      fieldName: 'status',
      label: $t('tenant.form.status'),
    },
  ],
  showDefaultActions: false,
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: modalTitle,
  onOpenChange: async (open) => {
    if (open) {
      await formApi.resetForm();
      if (currentRecord.value) {
        const r = currentRecord.value;
        await formApi.setValues({
          contact: r.contact ?? '',
          phone: r.phone ?? '',
          remark: r.remark ?? '',
          status: Boolean(r.status ?? true),
          tenantCode: r.tenantCode,
          tenantName: r.tenantName,
          tenantNameEn: r.tenantNameEn ?? '',
        });
      }
    }
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = (await formApi.getValues()) as CreateTenantParams;

      if (isEdit.value && currentRecord.value) {
        await updateTenantApi({
          ...values,
          id: currentRecord.value.id,
        });
      } else {
        await createTenantApi(values);
      }

      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record?: BackendTenantItem) {
  if (record) {
    isEdit.value = true;
    currentRecord.value = record;
  } else {
    isEdit.value = false;
    currentRecord.value = null;
  }
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Form />
  </VbenModal>
</template>

