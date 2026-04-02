<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { DictOption } from '#/api/system/dict';
import type { OrgInfo } from '#/api/system/org';

import { ref } from 'vue';

import { useVbenForm, useVbenModal, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import { getDictOptionsApi } from '#/api/system/dict';
import { createOrgApi, getOrgTreeApi, updateOrgApi } from '#/api/system/org';

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
const internalOptions = ref<DictOption[]>([]);

function buildFormSchema() {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入组织名称',
        maxlength: 50,
      },
      fieldName: 'deptName',
      label: '组织名称',
      rules: z.string().min(1, '请输入组织名称'),
    },
    {
      component: 'TreeSelect',
      componentProps: {
        allowClear: true,
        style: { width: '100%' },
        fieldNames: { label: 'deptName', value: 'id', children: 'children' },
        placeholder: '请选择上级组织',
        treeDefaultExpandAll: true,
      },
      fieldName: 'parentId',
      label: '上级组织',
      rules: z.string().min(1, '请选择上级组织'),
      hide: isEdit.value,
    },
    {
      component: 'Textarea',
      componentProps: {
        allowClear: true,
        autoSize: { minRows: 2, maxRows: 4 },
        maxlength: 200,
        placeholder: '请输入备注',
        showCount: true,
      },
      fieldName: 'remark',
      label: '备注',
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
    console.error('获取组织树失败:', error);
  }
}

async function loadInternalOptions() {
  try {
    const res = await getDictOptionsApi('de_base_dept_internal');
    internalOptions.value = res || [];
  } catch (error) {
    console.error('获取组织属性字典失败:', error);
    internalOptions.value = [
      { optionKey: 'company', optionValue: '公司' },
      { optionKey: 'department', optionValue: '部门' },
    ];
  }
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: '新增组织',
  onOpenChange: async (open: boolean) => {
    if (!open) return;

    currentType.value = currentType.value;
    currentData.value = currentData.value;
    currentRootId.value = currentRootId.value;

    isEdit.value = currentType.value === 'edit';
    isAdd.value = currentType.value === 'add';
    isAddChild.value = currentType.value === 'addChild';

    modalApi.setState({
      title: isEdit.value ? '编辑组织' : '新增组织',
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
        message.success('编辑成功');
      } else {
        const createData = {
          ...values,
          internal: currentData.value?.parentInternal || '',
        };
        await createOrgApi(createData);
        message.success('新增成功');
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
