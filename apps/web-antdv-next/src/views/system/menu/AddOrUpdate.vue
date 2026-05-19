<script lang="ts" setup>
import type { BackendMenuItem } from '#/api/core/menu';

import { ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';
// import { $t } from '#/locales';
import { $t } from '@vben/locales';

import { useVbenForm } from '#/adapter/form';
// import { useVbenForm } from '@vben-core/form-ui';
import {
  createFeatureApi,
  getResourcePoolListApi,
  updateFeatureApi,
} from '#/api/core/menu';

defineOptions({ name: 'MenuAddOrUpdate' });

const emit = defineEmits<{
  (
    e: 'success',
    payload?: {
      expandParentId?: null | number | string;
      targetId?: null | number | string;
    },
  ): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<BackendMenuItem | null>(null);
const currentParentId = ref<null | number | string>(null);

const featureTypeOptions = [
  { label: $t('menu.type.menu'), value: 'MENU' },
  { label: $t('menu.type.button'), value: 'BUTTON' },
];
const HTTP_ROUTE_PATH_REGEXP = /^https?:\/\//i;
const ROUTE_PATH_REGEXP = /^\/[\w/-]*$/;
const IPV4_SEGMENT_REGEXP = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;
const IPV4_HOST_REGEXP = new RegExp(
  String.raw`^${IPV4_SEGMENT_REGEXP}(?:\.${IPV4_SEGMENT_REGEXP}){3}$`,
);
const DOMAIN_LABEL_REGEXP = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function isHttpRoutePath(value: string) {
  return HTTP_ROUTE_PATH_REGEXP.test(value);
}

function isValidHttpRouteHost(value: string) {
  try {
    const { hostname, protocol } = new URL(value);
    if (!hostname || !['http:', 'https:'].includes(protocol)) {
      return false;
    }

    if (/^[\d.]+$/.test(hostname)) {
      return IPV4_HOST_REGEXP.test(hostname);
    }

    return hostname
      .split('.')
      .every((segment) => DOMAIN_LABEL_REGEXP.test(segment));
  } catch {
    return false;
  }
}

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
            return (
              z
                // .string({
                //   required_error: $t('menu.formRules.routePath'),
                //   invalid_type_error: $t('menu.formRules.routePath'),
                // })
                // .min(1, { message: $t('menu.formRules.routePath') })
                .string()
                .optional()
                .superRefine((v, ctx) => {
                  if (!v) {
                    return;
                  }

                  if (isHttpRoutePath(v)) {
                    if (!isValidHttpRouteHost(v)) {
                      ctx.addIssue({
                        code: 'custom',
                        message: $t('menu.formRules.routePathHttpHost'),
                      });
                    }
                    return;
                  }

                  if (!v.startsWith('/')) {
                    ctx.addIssue({
                      code: 'custom',
                      message: $t('menu.formRules.routePathStartWithSlash'),
                    });
                  }

                  if (!ROUTE_PATH_REGEXP.test(v)) {
                    ctx.addIssue({
                      code: 'custom',
                      message: $t('menu.formRules.routePathOnlyEnglish'),
                    });
                  }
                })
            );
          }
        },
        triggerFields: ['featureType'],
      },
      fieldName: 'routePath',
      label: $t('menu.form.routePath'),
    },
    {
      component: 'Select',
      componentProps: {
        disabled: isEdit.value,
        mode: 'multiple',
        options: [] as { label: string; value: string }[],
        placeholder: $t('tenant.form.resourcePool') || '请选择关联资源池',
        style: { width: '100%' },
      },
      fieldName: 'resourceCode',
      label: $t('tenant.form.resourcePool') || '关联资源池',
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
  bordered: true,
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  // 点击弹窗外侧不关闭弹窗
  closeOnClickModal: false,
  title: $t('menu.action.add'),
  confirmText: $t('system.common.ok'),
  onOpenChange: async (isOpen) => {
    if (isOpen) {
      await formApi.resetForm();

      try {
        const poolRes = await getResourcePoolListApi();
        await formApi.updateSchema([
          {
            fieldName: 'resourceCode',
            componentProps: {
              options: (poolRes ?? []).map((p) => ({
                label: p.resourceName,
                value: p.resourceCode,
              })),
              // 暂时去掉，添加上以后再给打开
              // disabled: isEdit.value,
            },
          },
        ]);
      } catch (error) {
        console.error('Fetch resource pool failed', error);
      }

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
          resourceCode: String(r.resourceCode ?? '')
            .split(',')
            .filter(Boolean),
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
        resourceCode: Array.isArray(values.resourceCode)
          ? values.resourceCode.join(',')
          : (values.resourceCode ?? ''),
      };
      isEdit.value && currentRecord.value
        ? await updateFeatureApi({
            ...payload,
            id: currentRecord.value.id,
          })
        : await createFeatureApi(payload);
      modalApi.close();

      // 计算需要定位的行ID
      let targetId: number | string | undefined;
      if (isEdit.value) {
        // 编辑模式：定位到被编辑的行
        targetId = currentRecord.value?.id;
      } else {
        // 新增模式：定位到新增的行（使用parentId作为目标，展开父节点后用户能看到新增的行）
        targetId =
          payload.parentId === 0
            ? undefined
            : (payload.parentId as number | string);
      }

      const expandParentId =
        isEdit.value || !payload.parentId
          ? undefined
          : (payload.parentId as number | string);
      emit('success', { expandParentId, targetId });
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
