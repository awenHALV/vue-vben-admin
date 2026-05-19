<script lang="ts" setup>
import type {
  BackendTenantItem,
  TenantCreateBody,
  UpdateTenantParams,
} from '#/api/core/tenant';
import type { DictOption } from '#/api/system/dict';

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
import { getDictOptionsApi } from '#/api/system/dict';

defineOptions({ name: 'TenantAddOrUpdate' });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const isEdit = ref(false);
const currentRecord = ref<BackendTenantItem | null>(null);
/** 编辑态：详情接口完整数据，提交时 appFeatureIds 直接取详情里的 featureIds */
const editTenantDetail = ref<BackendTenantItem | null>(null);
/** 备份原始功能列表，用于补全父级节点 ID */
const featureRawList = ref<BackendMenuItem[]>([]);

const PHONE_CN = /^1[3-9]\d{9}$/;
const CREDIT_CODE_REG = /^[0-9A-Z]{18}$/;

/** 编辑回填：不含功能列表（该字段隐藏，以详情接口为准提交） */
function getTenantFormValuesWithoutFeatureIds(r: BackendTenantItem) {
  return {
    adminName: String(r.adminName ?? r.admin_name ?? r.contact ?? ''),
    adminPhone: String(r.adminPhone ?? r.admin_phone ?? r.phone ?? ''),
    companyName: String(r.companyName ?? ''),
    creditCode: String(r.creditCode ?? ''),
    status: String(r.status ?? ''),
    tenantName: String(r.tenantName ?? ''),
  };
}

function mapDictToSelectOptions(items: DictOption[]) {
  const useEn = preferences.app.locale === 'en-US';
  return (items ?? []).map((item) => ({
    label:
      useEn && item.optionValueEn
        ? item.optionValueEn
        : (item.optionValue ?? item.optionKey),
    value: item.optionKey,
  }));
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
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [labelCreditCode]))
        .regex(CREDIT_CODE_REG, $t('tenant.rules.creditCodeInvalid')),
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
      component: 'Select',
      componentProps: {
        style: { width: '100%' },
        options: [] as { label: string; value: string }[],
        placeholder: $t('tenant.form.placeholder.status'),
      },
      fieldName: 'status',
      label: $t('tenant.form.status'),
      rules: z
        .string()
        .min(1, $t('ui.formRules.required', [$t('tenant.form.status')])),
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
    featureRawList.value = raw;
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

/**
 * 根据已选 ID 列表及全量功能树，补全所有父级节点 ID
 */
function findFullFeatureIds(
  selectedIds: string[],
  allFeatures: BackendMenuItem[],
): string[] {
  const idToParentId = new Map<string, null | string>();

  function traverse(items: BackendMenuItem[]) {
    for (const item of items) {
      if (!item) continue;
      idToParentId.set(
        String(item.id),
        item.parentId ? String(item.parentId) : null,
      );
      if (item.children && Array.isArray(item.children)) {
        traverse(item.children);
      }
    }
  }

  traverse(allFeatures);

  const resultSet = new Set<string>(selectedIds);
  for (const id of selectedIds) {
    let parentId = idToParentId.get(id);
    while (parentId) {
      resultSet.add(parentId);
      parentId = idToParentId.get(parentId);
    }
  }

  return [...resultSet].filter((id) => id && id !== '0');
}

/** 拉取租户状态下拉；返回选项第一项的 value，供新增时作为默认值 */
async function refreshTenantStatusOptions(): Promise<string | undefined> {
  try {
    const res = await getDictOptionsApi('tenant_status');
    const options = mapDictToSelectOptions(res ?? []);
    await formApi.updateSchema([
      {
        fieldName: 'status',
        componentProps: {
          options,
        },
      },
    ]);
    return options[0]?.value;
  } catch {
    return undefined;
  }
}

const [VbenModal, modalApi] = useVbenModal({
  bordered: true,
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  // 点击弹窗外侧不关闭弹窗
  closeOnClickModal: false,
  title: $t('tenant.modal.addTenant'),
  confirmText: $t('system.common.ok'),
  onOpenChange: async (open) => {
    if (!open) {
      editTenantDetail.value = null;
      return;
    }
    // 先重置，再按新增/编辑切换功能列表显隐与校验
    await formApi.resetForm();
    editTenantDetail.value = null;
    const defaultStatusValue = await refreshTenantStatusOptions();
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
      if (defaultStatusValue !== undefined) {
        await formApi.setFieldValue('status', defaultStatusValue);
      }
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
        featureIds?: string[];
        status: string;
        tenantName: string;
      };

      const fullFeatureIds = findFullFeatureIds(
        Array.isArray(values.featureIds) ? values.featureIds : [],
        featureRawList.value,
      );

      const createBody = {
        adminName: values.adminName.trim(),
        adminPhone: values.adminPhone.trim(),
        featureIds: fullFeatureIds.map(String).join(','),
        companyName: values.companyName.trim(),
        creditCode: values.creditCode.trim(),
        status: String(values.status ?? ''),
        tenantName: values.tenantName.trim(),
      } as TenantCreateBody;

      await (isEdit.value && currentRecord.value
        ? updateTenantApi({
            ...createBody,
            id: currentRecord.value.id,
            tenantCode: currentRecord.value.tenantCode,
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
