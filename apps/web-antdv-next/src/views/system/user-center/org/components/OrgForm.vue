<script lang="ts" setup>
import type { OrgInfo } from '#/api/system/org';

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
      hide: isEdit.value,
    },
    {
      component: 'Select',
      componentProps: {
        style: { width: '100%' },
        options: [],
        placeholder: $t('system.org.orgTypePlaceholder'),
      },
      fieldName: 'internal',
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
    labelWidth: 100,
  },
  schema: buildFormSchema(),
  showDefaultActions: false,
});

async function loadOrgTree() {
  try {
    const res = await getOrgTreeApi();
    orgTreeData.value = res || [];
    await formApi.updateSchema([
      {
        fieldName: 'parentId',
        componentProps: {
          treeData: orgTreeData.value,
        },
      },
    ]);
  } catch (error) {
    console.error($t('system.org.loadOrgTreeFailed'), error);
  }
}

async function loadInternalOptions() {
  try {
    const res = await getDictOptionsApi('sys_dept_type');
    await formApi.updateSchema([
      {
        fieldName: 'internal',
        componentProps: {
          options:
            res.map((item) => ({
              label: item.optionValue,
              value: item.optionKey,
            })) || [],
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

    if (isEdit.value && currentData.value?.id) {
      await formApi.setValues({
        deptName: currentData.value.deptName || '',
        remark: currentData.value.remark || '',
      });
    } else if (isAddChild.value && currentData.value?.parentId) {
      await formApi.setValues({
        parentId: currentData.value.parentId,
      });
      await formApi.updateSchema([
        {
          fieldName: 'parentId',
          componentProps: {
            disabled: true,
          },
        },
      ]);
    } else if (isAdd.value) {
      await formApi.updateSchema([
        {
          fieldName: 'parentId',
          componentProps: {
            disabled: false,
          },
        },
      ]);
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
        });
        message.success($t('system.common.editSuccess'));
      } else {
        const createData = {
          ...values,
          internal: currentData.value?.parentInternal || '',
        };
        await createOrgApi(createData);
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
