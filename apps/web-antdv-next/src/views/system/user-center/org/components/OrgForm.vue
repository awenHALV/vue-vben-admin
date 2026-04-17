<script lang="ts" setup>
import type { CreateOrgParams, OrgInfo } from '#/api/system/org';

import { ref } from 'vue';

import { useVbenForm, useVbenModal, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import { getDictOptionsApi } from '#/api/system/dict';
import { createOrgApi, getOrgTreeApi, updateOrgApi } from '#/api/system/org';
import { $t } from '#/locales';

defineOptions({ name: 'OrgForm' });

const emit = defineEmits<{
  success: [];
}>();

const isEdit = ref(false);
const isAdd = ref(false);
const isAddChild = ref(false);

const currentType = ref<'add' | 'addChild' | 'edit'>('add');
const currentData = ref<Partial<OrgInfo> & { parentInternal?: string }>({});
const currentRootId = ref('');

const orgTreeData = ref<any[]>([]);

/** 是否为顶层组织（根节点） */
function isTopLevelOrg(data?: Partial<OrgInfo>): boolean {
  const pid = data?.parentId;
  return !pid || pid === '0';
}

function buildFormSchema() {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.org.orgNamePlaceholder'),
        maxlength: 50,
      },
      fieldName: 'deptName',
      label: $t('system.org.orgName'),
      rules: z.string().min(1, $t('system.org.orgNameRequired')),
    },
    {
      component: 'TreeSelect',
      componentProps: {
        allowClear: true,
        style: { width: '100%' },
        fieldNames: { label: 'deptName', value: 'id', children: 'children' },
        placeholder: $t('system.org.parentOrgPlaceholder'),
        treeDefaultExpandAll: true,
      },
      fieldName: 'parentId',
      label: $t('system.org.parentOrg'),
      rules: z.string().min(1, $t('system.org.parentOrgRequired')),
    },
    {
      component: 'Select',
      componentProps: {
        style: { width: '100%' },
        options: [],
        placeholder: $t('system.org.orgTypePlaceholder'),
      },
      fieldName: 'deptType',
      label: $t('system.org.orgType'),
      rules: z.string().min(1, $t('system.org.orgTypeRequired')),
    },
    {
      component: 'Textarea',
      componentProps: {
        allowClear: true,
        autoSize: { minRows: 2, maxRows: 4 },
        maxlength: 200,
        placeholder: $t('system.org.remarksPlaceholder'),
        showCount: true,
      },
      fieldName: 'remark',
      label: $t('system.common.remarks'),
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

async function loadOrgTree() {
  try {
    const res = await getOrgTreeApi();
    orgTreeData.value = res || [];
  } catch (error) {
    console.error($t('system.org.loadOrgTreeFailed'), error);
  }
}

async function syncParentIdField() {
  const topLevel = isTopLevelOrg(currentData.value);

  const hide = (isEdit.value && topLevel) || (isAdd.value && topLevel);
  const disabled = (isEdit.value && !topLevel) || isAddChild.value;
  const parentIdRequired = isAddChild.value || (isAdd.value && !topLevel);

  const rules = parentIdRequired
    ? z.string().min(1, $t('system.org.parentOrgRequired'))
    : z.string().optional();

  await formApi.updateSchema([
    {
      fieldName: 'parentId',
      hide,
      rules,
      componentProps: {
        allowClear: true,
        disabled,
        style: { width: '100%' },
        fieldNames: { label: 'deptName', value: 'id', children: 'children' },
        placeholder: $t('system.org.parentOrgPlaceholder'),
        treeData: orgTreeData.value,
        treeDefaultExpandAll: true,
      },
    },
  ]);
}

async function loadInternalOptions() {
  try {
    const res = await getDictOptionsApi('sys_dept_type');
    await formApi.updateSchema([
      {
        fieldName: 'deptType',
        componentProps: {
          options:
            res.map((item) => ({
              label: item.optionValue,
              value: item.optionKey,
            })) || [],
          disabled: isEdit.value,
        },
      },
    ]);
  } catch (error) {
    console.error($t('system.org.loadOrgTypeDictFailed'), error);
  }
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  // 点击不关闭弹窗
  closeOnClickModal: false,
  title: $t('system.org.addOrg'),
  onOpenChange: async (open: boolean) => {
    if (!open) return;

    isEdit.value = currentType.value === 'edit';
    isAdd.value = currentType.value === 'add';
    isAddChild.value = currentType.value === 'addChild';

    modalApi.setState({
      title: isEdit.value ? $t('system.org.editOrg') : $t('system.org.addOrg'),
    });

    await formApi.resetForm();
    await loadOrgTree();
    await loadInternalOptions();
    await syncParentIdField();

    if (isEdit.value && currentData.value?.id) {
      const values: Record<string, string> = {
        deptName: currentData.value.deptName || '',
        remark: currentData.value.remark || '',
        deptType: currentData.value.deptType || '',
      };
      if (!isTopLevelOrg(currentData.value) && currentData.value.parentId) {
        values.parentId = currentData.value.parentId;
      }
      await formApi.setValues(values);
    } else if (isAddChild.value && currentData.value?.parentId) {
      await formApi.setValues({
        parentId: currentData.value.parentId,
      });
    }
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = await formApi.getValues();

      if (isEdit.value) {
        await updateOrgApi({
          id: currentData.value?.id || '',
          deptName: values.deptName,
          remark: values.remark,
          parentId: values.parentId,
          deptType: values.deptType,
        });
        message.success($t('system.common.editSuccess'));
      } else {
        const createPayload: CreateOrgParams = {
          deptName: values.deptName as string,
          deptType: values.deptType,
          parentId:
            isAdd.value && isTopLevelOrg(currentData.value)
              ? '0'
              : (values.parentId as string | undefined),
          remark: values.remark as string | undefined,
        };
        await createOrgApi(createPayload);
        message.success($t('system.common.addSuccess'));
      }

      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(
  type: 'add' | 'addChild' | 'edit',
  data?: Partial<OrgInfo> & { parentInternal?: string },
  rootId?: string,
) {
  currentType.value = type;
  currentData.value = data || {};
  currentRootId.value = rootId || '';
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Form />
  </VbenModal>
</template>
