<script lang="ts" setup>
import type { BackendMenuItem } from '#/api/core/menu';

import { ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';
// import { $t } from '#/locales';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
// import { useVbenForm } from '@vben-core/form-ui';
import { createFeatureApi, updateFeatureApi } from '#/api/core/menu';

defineOptions({ name: 'MenuAddOrUpdate' });

const emit = defineEmits<{
  (
    e: 'success',
    payload?: { expandParentId?: null | number | string },
  ): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<BackendMenuItem | null>(null);
const currentParentId = ref<null | number | string>(null);

const featureTypeOptions = [
  { label: $t('menu.type.menu'), value: 'MENU' },
  { label: $t('menu.type.button'), value: 'BUTTON' },
];
const ROUTE_PATH_REGEXP = /^\/[\w/-]*$/;

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 100,
  },
  schema: [
    {
      component: 'Select',
      componentProps: {
        options: featureTypeOptions,
        placeholder: $t('menu.placeholder.select', [
          $t('menu.form.featureType'),
        ]),
        style: { width: '100%' },
      },
      fieldName: 'featureType',
      label: $t('menu.form.featureType'),
      defaultValue: 'MENU',
      rules: z.string().min(1, { message: $t('menu.form.featureType') }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [
          $t('menu.form.featureCode'),
        ]),
      },
      fieldName: 'featureCode',
      label: $t('menu.form.featureCode'),
      rules: z.string().min(1, { message: $t('menu.form.featureCode') }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [
          $t('menu.form.featureName'),
        ]),
      },
      fieldName: 'featureName',
      label: $t('menu.form.featureName'),
      rules: z.string().min(1, {
        message: $t('menu.formRules.featureName'),
      }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [
          $t('menu.form.featureNameEn'),
        ]),
      },
      fieldName: 'featureNameEn',
      label: $t('menu.form.featureNameEn'),
      rules: z.string().min(1, {
        message: $t('menu.formRules.featureNameEn'),
      }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [$t('menu.form.routePath')]),
      },
      dependencies: {
        rules(values) {
          if (values.featureType === 'MENU') {
            return z
              .string({
                required_error: $t('menu.formRules.routePath'),
                invalid_type_error: $t('menu.formRules.routePath'),
              })
              .min(1, { message: $t('menu.formRules.routePath') })
              .refine((v) => v.startsWith('/'), {
                message: $t('menu.formRules.routePathStartWithSlash'),
              })
              .refine((v) => ROUTE_PATH_REGEXP.test(v), {
                message: $t('menu.formRules.routePathOnlyEnglish'),
              });
          }
        },
        triggerFields: ['featureType'],
      },
      fieldName: 'routePath',
      label: $t('menu.form.routePath'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [
          $t('menu.form.featureIcon'),
        ]),
      },
      fieldName: 'featureIcon',
      label: $t('menu.form.featureIcon'),
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: $t('menu.placeholder.input', [$t('menu.form.sort')]),
      },
      fieldName: 'sort',
      label: $t('menu.form.sort'),
      defaultValue: 0,
    },
  ],
  showDefaultActions: false,
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: $t('menu.action.add'),
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      await formApi.resetForm();
      if (currentRecord.value) {
        const r = currentRecord.value;
        await formApi.setValues({
          featureCode: r.featureCode,
          featureIcon: r.featureIcon ?? '',
          featureName: r.featureName,
          featureNameEn: r.featureNameEn ?? '',
          featureType: r.featureType,
          parentId: r.parentId ?? 0,
          routePath: r.routePath ?? '',
          sort: r.sort ?? 0,
        });
      } else if (currentParentId.value !== null) {
        formApi.setFieldValue('parentId', currentParentId.value);
      }
    }
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = await formApi.getValues();
      const payload = {
        featureCode: values.featureCode,
        featureIcon: values.featureIcon || '',
        featureName: values.featureName,
        featureNameEn: values.featureNameEn || '',
        featureType: values.featureType,
        parentId:
          values.parentId ??
          currentRecord.value?.parentId ??
          currentParentId.value ??
          0,
        routePath: values.routePath || '',
        sort: values.sort ?? 0,
      };
      isEdit.value && currentRecord.value
        ? await updateFeatureApi({
            ...payload,
            id: currentRecord.value.id,
          })
        : await createFeatureApi(payload);
      modalApi.close();
      const expandParentId =
        isEdit.value || !payload.parentId
          ? undefined
          : (payload.parentId as number | string);
      emit('success', { expandParentId });
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(parent?: BackendMenuItem | null, record?: BackendMenuItem) {
  if (record) {
    isEdit.value = true;
    currentRecord.value = record;
    currentParentId.value = null;
    modalApi.setState({ title: $t('menu.action.edit') });
  } else {
    isEdit.value = false;
    currentRecord.value = null;
    currentParentId.value = parent?.id ?? null;
    modalApi.setState({ title: $t('menu.action.add') });
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
