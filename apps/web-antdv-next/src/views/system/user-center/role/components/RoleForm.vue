<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';

import { ref } from 'vue';

import { useVbenModal, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { getOrgTreeApi } from '#/api/system/org';
import { createRoleApi, updateRoleApi } from '#/api/system/role';
import { $t } from '#/locales';

defineOptions({ name: 'RoleForm' });

const emit = defineEmits<{
  success: [];
}>();

const isEdit = ref(false);
const currentId = ref<string>('');

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 65,
    wrapperClass: 'grid-cols-1',
  },
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('system.role.roleNamePlaceholder'),
        maxlength: 50,
        allowClear: true,
      },
      fieldName: 'roleName',
      label: $t('system.role.roleName'),
      rules: z.string().min(1, $t('system.role.roleNameRequired')),
    },
    {
      component: 'TreeSelect',
      componentProps: {
        placeholder: $t('system.role.organizationPlaceholder'),
        treeDefaultExpandAll: true,
        style: { width: '100%' },
        allowClear: true,
        showSearch: true,
        fieldNames: { label: 'deptName', value: 'id', children: 'children' },
        filterTreeNode: (searchValue: string, node: any) =>
          node.deptName?.toLowerCase().includes(searchValue.toLowerCase()),
        treeData: [],
      },
      fieldName: 'deptId',
      label: $t('system.role.organization'),
      rules: z.string().min(1, $t('system.role.organizationRequired')),
    },
  ],
  showDefaultActions: false,
});

const [VbenModal, modalApi] = useVbenModal({
  bordered: true,
  destroyOnClose: true,
  confirmText: $t('system.common.ok'),
  onOpenChange: async (open) => {
    if (!open) return;

    modalApi.setState({ confirmLoading: false });
    const { id, record, deptId } = modalApi.getData<any>() || {};

    // 加载部门树
    try {
      const depts = await getOrgTreeApi();
      await formApi.updateSchema([
        {
          fieldName: 'deptId',
          componentProps: {
            treeData: depts || [],
          },
        },
      ]);
    } catch (error) {
      console.error('获取部门树失败:', error);
    }

    if (id) {
      isEdit.value = true;
      currentId.value = id;
      modalApi.setState({ title: $t('system.role.editRole') });
      if (record) {
        await formApi.setValues(record);
      }
    } else {
      isEdit.value = false;
      currentId.value = '';
      modalApi.setState({ title: $t('system.role.addRole') });
      await formApi.resetForm();
      if (deptId) {
        await formApi.setFieldValue('deptId', deptId);
      }
    }
  },
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) return;

    modalApi.setState({ confirmLoading: true });
    try {
      const values = await formApi.getValues();
      if (isEdit.value) {
        await updateRoleApi({ ...values, id: currentId.value });
        message.success($t('system.common.editSuccess'));
      } else {
        await createRoleApi(values);
        message.success($t('system.common.addSuccess'));
      }
      emit('success');
      modalApi.close();
    } catch (error: any) {
      message.error(error?.message || (isEdit.value ? '编辑失败' : '新增失败'));
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(data: { deptId?: string; id?: string; record?: RoleInfo }) {
  modalApi.setData(data);
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <div class="px-4 py-2">
      <Form />
    </div>
  </VbenModal>
</template>
