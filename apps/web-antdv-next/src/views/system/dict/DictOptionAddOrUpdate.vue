<script lang="ts" setup>
import type { DictOptionBody, DictOptionItem } from '#/api/core/dict';

import { nextTick, ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
import { createDictOptionApi, updateDictOptionApi } from '#/api/core/dict';

defineOptions({ name: 'DictOptionAddOrUpdate' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

/** 字典项英文值：仅允许英文字母、数字、半角空格 */
const OPTION_VALUE_EN_REGEXP = /^[\da-z ]+$/i;

const isEdit = ref(false);
const dictIdRef = ref<null | number | string>(null);
const editingId = ref<null | number | string>(null);

/**
 * 与截图一致：字典编码(选填) → 字典项键/值/英文(必填) → 字典排序(必填) → 备注(选填)
 */
function buildFormSchema() {
  const ph = $t('ui.placeholder.input');
  const labelDictCode = $t('dict.list.dictCode');
  const labelKey = $t('dict.optionForm.optionKey');
  const labelValue = $t('dict.optionForm.optionValue');
  const labelValueEn = $t('dict.optionForm.optionValueEn');
  const labelSort = $t('dict.optionForm.sort');
  const labelRemark = $t('dict.optionForm.remark');

  return [
    {
      component: 'Input',
      componentProps: { placeholder: ph, allowClear: true },
      defaultValue: '',
      fieldName: 'dictCode',
      label: labelDictCode,
      disabled: true,
      rules: z.string().optional(),
    },
    {
      component: 'Input',
      componentProps: { placeholder: ph, allowClear: true },
      fieldName: 'optionKey',
      label: labelKey,
      rules: z.string().min(1, $t('ui.formRules.required', [labelKey])),
    },
    {
      component: 'Input',
      componentProps: { placeholder: ph, allowClear: true },
      fieldName: 'optionValue',
      label: labelValue,
      rules: z.string().min(1, $t('ui.formRules.required', [labelValue])),
    },
    {
      component: 'Input',
      componentProps: { placeholder: ph, allowClear: true },
      fieldName: 'optionValueEn',
      label: labelValueEn,
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [labelValueEn]))
        .regex(
          OPTION_VALUE_EN_REGEXP,
          $t('dict.formRules.optionValueEnOnlyEnglish'),
        ),
    },
    {
      component: 'InputNumber',
      componentProps: {
        class: 'w-full',
        min: 0,
        placeholder: ph,
      },
      defaultValue: 0,
      fieldName: 'sort',
      label: labelSort,
      rules: z.coerce.number().int().min(0),
    },
    {
      component: 'Input',
      componentProps: { placeholder: ph, allowClear: true },
      fieldName: 'remark',
      label: labelRemark,
      defaultValue: '',
      rules: z.string().optional(),
    },
  ];
}

const [Form, formApi] = useVbenForm({
  commonConfig: { labelWidth: 100 },
  schema: buildFormSchema(),
  showDefaultActions: false,
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  // 点击弹窗外侧不关闭弹窗
  closeOnClickModal: false,
  title: $t('dict.modal.add'),
  confirmText: $t('system.common.ok'),
  class: 'w-[min(100%,480px)]',
  onOpenChange(open) {
    if (!open) {
      dictIdRef.value = null;
      editingId.value = null;
    }
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const id = dictIdRef.value;
    if (id === null) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = (await formApi.getValues()) as {
        dictCode?: string;
        optionKey: string;
        optionValue: string;
        optionValueEn: string;
        remark?: string;
        sort: number;
      };

      const dc = values.dictCode?.trim();
      const body: DictOptionBody = {
        ...(dc ? { dictCode: dc } : {}),
        sort: Number(values.sort ?? 0),
        optionKey: values.optionKey.trim(),
        optionValue: values.optionValue.trim(),
        optionValueEn: values.optionValueEn.trim(),
        remark: values.remark?.trim() ? values.remark.trim() : undefined,
      };

      await (isEdit.value && editingId.value !== null
        ? updateDictOptionApi(id, editingId.value, body)
        : createDictOptionApi(id, body));

      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(
  dictId: number | string,
  record?: DictOptionItem,
  defaultDictCode = '',
) {
  dictIdRef.value = dictId;
  isEdit.value = Boolean(record);
  editingId.value = record?.id ?? null;
  modalApi.setState({
    title: record ? $t('dict.modal.edit') : $t('dict.modal.add'),
  });
  modalApi.open();
  void nextTick(async () => {
    await formApi.resetForm();
    const dictCode = record?.dictCode ?? (defaultDictCode || '');
    await (record
      ? formApi.setValues(
          {
            dictCode,
            optionKey: record.optionKey ?? '',
            optionValue: record.optionValue ?? '',
            optionValueEn: record.optionValueEn ?? '',
            sort: record.sort ?? 0,
            remark: record.remark ?? '',
          },
          false,
        )
      : formApi.setValues(
          {
            dictCode,
            optionKey: '',
            optionValue: '',
            optionValueEn: '',
            sort: 0,
            remark: '',
          },
          false,
        ));
  });
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Form />
  </VbenModal>
</template>
