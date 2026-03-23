<script lang="ts" setup>
import type {
  BackendTenantItem,
  TenantCreateBody,
  UpdateTenantParams,
} from '#/api/core/tenant';

import { nextTick, ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import {
  getMineFeaturesRawApi,
  mapBackendMenusToFeatureTree,
} from '#/api/core/menu';
import {
  createTenantApi,
  getTenantDetailApi,
  updateTenantApi,
} from '#/api/core/tenant';

defineOptions({ name: 'TenantAddOrUpdate' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<BackendTenantItem | null>(null);
/** 编辑态：详情接口完整数据，提交时 appFeatureIds 直接取详情里的 featureIds */
const editTenantDetail = ref<BackendTenantItem | null>(null);

const PHONE_CN = /^1[3-9]\d{9}$/;

/** 编辑回填：不含功能列表（该字段隐藏，以详情接口为准提交） */
function getTenantFormValuesWithoutFeatureIds(r: BackendTenantItem) {
  return {
    adminName: String(r.adminName ?? r.admin_name ?? r.contact ?? ''),
    adminPhone: String(r.adminPhone ?? r.admin_phone ?? r.phone ?? ''),
    companyName: String(r.companyName ?? ''),
    creditCode: String(r.creditCode ?? ''),
    tenantName: String(r.tenantName ?? ''),
  };
}

function normalizeFeatureIds(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    return v
      .map((x) => (x === null || x === undefined ? '' : String(x).trim()))
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => (x === null || x === undefined ? '' : String(x).trim()))
          .filter(Boolean);
      }
    } catch {
      /* 非 JSON 时按逗号分隔 */
    }
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

function buildFormSchema() {
  const labelTenantInfo = $t('tenant.form.tenantInfo');
  const labelCompanyName = $t('tenant.form.companyName');
  const labelCreditCode = $t('tenant.form.creditCode');
  const labelAdminName = $t('tenant.form.adminName');
  const labelAdminPhone = $t('tenant.form.adminPhone');

  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('tenant.form.placeholder.tenantInfo'),
      },
      fieldName: 'tenantName',
      label: labelTenantInfo,
      rules: z.string().min(1, $t('ui.formRules.required', [labelTenantInfo])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('tenant.form.placeholder.companyName'),
      },
      fieldName: 'companyName',
      label: labelCompanyName,
      rules: z.string().min(1, $t('ui.formRules.required', [labelCompanyName])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('tenant.form.placeholder.creditCode'),
      },
      fieldName: 'creditCode',
      label: labelCreditCode,
      rules: z.string().min(1, $t('ui.formRules.required', [labelCreditCode])),
    },
    {
      component: 'TreeSelect',
      componentProps: {
        style: { width: '100%' },
        allowClear: true,
        maxTagCount: 3,
        multiple: true,
        showSearch: true,
        treeCheckable: true,
        treeData: [],
        treeDefaultExpandAll: true,
        placeholder: $t('tenant.form.placeholder.features'),
      },
      defaultValue: [] as string[],
      fieldName: 'featureIds',
      hide: false,
      label: $t('tenant.form.features'),
      /** 新增时必填；编辑时通过 onOpenChange 改为隐藏并放宽校验 */
      rules: z
        .array(z.string())
        .min(1, $t('ui.formRules.required', [$t('tenant.form.features')])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('tenant.form.placeholder.adminName'),
      },
      fieldName: 'adminName',
      label: labelAdminName,
      rules: z.string().min(1, $t('ui.formRules.required', [labelAdminName])),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('tenant.form.placeholder.adminPhone'),
      },
      fieldName: 'adminPhone',
      label: labelAdminPhone,
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [labelAdminPhone]))
        .regex(PHONE_CN, $t('tenant.rules.phoneInvalid')),
    },
  ];
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 120,
  },
  schema: buildFormSchema(),
  showDefaultActions: false,
});

/** 与 getAllMenusApi 同源接口拉取功能树，并刷新 TreeSelect */
async function refreshFeatureTreeFromMineApi() {
  try {
    const raw = await getMineFeaturesRawApi();
    const tree = mapBackendMenusToFeatureTree(raw, {
      t: $t,
      useEnglishName: preferences.app.locale === 'en-US',
    });
    formApi.updateSchema([
      {
        fieldName: 'featureIds',
        componentProps: {
          treeData: tree,
        },
      },
    ]);
  } catch {
    message.error($t('menu.message.fetchFailed'));
  }
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: $t('tenant.modal.addTenant'),
  onOpenChange: async (open) => {
    if (!open) {
      editTenantDetail.value = null;
      return;
    }
    // 先重置，再按新增/编辑切换功能列表显隐与校验
    await formApi.resetForm();
    editTenantDetail.value = null;
    const labelFeatures = $t('tenant.form.features');
    const featureIdsRequired = z
      .array(z.string())
      .min(1, $t('ui.formRules.required', [labelFeatures]));
    const featureIdsOptional = z.array(z.string()).optional();

    if (currentRecord.value) {
      // 编辑：拉详情，不展示功能列表；提交时 featureIds 直接用详情里的 featureIds
      await formApi.updateSchema([
        {
          fieldName: 'featureIds',
          hide: true,
          rules: featureIdsOptional,
          componentProps: { treeData: [] },
        },
      ]);
      try {
        const detail = await getTenantDetailApi(currentRecord.value.id);
        editTenantDetail.value = detail;
        await formApi.setValues(
          {
            ...getTenantFormValuesWithoutFeatureIds(detail),
            featureIds: [],
          },
          false,
        );
      } catch {
        message.error($t('tenant.message.detailFailed'));
        modalApi.close();
      }
    } else {
      // 新增：展示功能列表且必填
      await formApi.updateSchema([
        {
          fieldName: 'featureIds',
          hide: false,
          rules: featureIdsRequired,
        },
      ]);
      await refreshFeatureTreeFromMineApi();
    }

    await nextTick();
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = (await formApi.getValues()) as {
        adminName: string;
        adminPhone: string;
        companyName: string;
        creditCode: string;
        featureIds?: string;
        tenantName: string;
      };

      const createBody: TenantCreateBody = {
        adminName: values.adminName.trim(),
        adminPhone: values.adminPhone.trim(),
        featureIds: Array.isArray(values.featureIds)
          ? values.featureIds?.map(String).join(',')
          : values.featureIds,
        companyName: values.companyName.trim(),
        creditCode: values.creditCode.trim(),
        tenantName: values.tenantName.trim(),
      };

      await (isEdit.value && currentRecord.value
        ? updateTenantApi({
            ...createBody,
            id: currentRecord.value.id,
            tenantCode: currentRecord.value.tenantCode,
            status: currentRecord.value.status,
          } satisfies UpdateTenantParams)
        : createTenantApi(createBody));

      modalApi.close();
      emit('success');
      message.success($t('tenant.message.saveSuccess'));
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record?: BackendTenantItem) {
  if (record) {
    isEdit.value = true;
    currentRecord.value = record;
    modalApi.setState({ title: $t('tenant.modal.editTenant') });
  } else {
    isEdit.value = false;
    currentRecord.value = null;
    modalApi.setState({ title: $t('tenant.modal.addTenant') });
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
