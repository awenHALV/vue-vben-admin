<script lang="ts" setup>
import type { DictCreateBody, DictListItem } from '#/api/core/dict';

import { nextTick, ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
import { createDictApi, updateDictApi } from '#/api/core/dict';

defineOptions({ name: 'DictAddOrUpdate' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<DictListItem | null>(null);

function getEditFormValues(r: DictListItem) {
  return {
    dictCode: String(r.dictCode ?? ''),
    dictName: String(r.dictName ?? ''),
    remark: String(r.remark ?? ''),
  };
}

function buildFormSchema() {
  const labelDictCode = $t('dict.form.dictCode');
  const labelDictName = $t('dict.form.dictName');
  const labelRemark = $t('dict.form.remark');
  const ph = $t('ui.placeholder.input');

  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: ph,
        allowClear: true,
      },
      fieldName: 'dictCode',
      label: labelDictCode,
      rules: z.string().min(1, $t('ui.formRules.required', [labelDictCode])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: ph,
        allowClear: true,
      },
      fieldName: 'dictName',
      label: labelDictName,
      rules: z.string().min(1, $t('ui.formRules.required', [labelDictName])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: ph,
        allowClear: true,
      },
      fieldName: 'remark',
      label: labelRemark,
      defaultValue: '',
      rules: z.string().optional(),
    },
  ];
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 70,
  },
  schema: buildFormSchema(),
  showDefaultActions: false,
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: $t('dict.modal.add'),
  confirmText: $t('system.common.ok'),
  async onOpenChange(open) {
    if (!open) {
      return;
    }
    await formApi.resetForm();
    await nextTick();
    if (currentRecord.value) {
      const values = getEditFormValues(currentRecord.value);
      await formApi.setValues(values, false);
      await formApi.updateSchema([
        {
          fieldName: 'dictCode',
          componentProps: { disabled: true },
        },
      ]);
    } else {
      await formApi.updateSchema([
        {
          fieldName: 'dictCode',
          componentProps: { disabled: false },
        },
      ]);
    }
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = (await formApi.getValues()) as {
        dictCode: string;
        dictName: string;
        remark?: string;
      };

      const body: DictCreateBody = {
        dictCode: values.dictCode.trim(),
        dictName: values.dictName.trim(),
        remark: values.remark?.trim() ? values.remark.trim() : undefined,
      };

      await (isEdit.value && currentRecord.value
        ? updateDictApi(currentRecord.value.id, body)
        : createDictApi(body));

      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record?: DictListItem) {
  if (record) {
    isEdit.value = true;
    currentRecord.value = record;
    modalApi.setState({ title: $t('dict.modal.edit') });
  } else {
    isEdit.value = false;
    currentRecord.value = null;
    modalApi.setState({ title: $t('dict.modal.add') });
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
