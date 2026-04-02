<script lang="ts" setup>
import type { RoleInfo } from '#/api/system/role';
import type { OrgInfo } from '#/api/system/org';
import { getOrgTreeApi } from '#/api/system/org';
import { computed, ref, watch } from 'vue';

import { $t } from '#/locales';

import {
  Button, Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Switch,
  TextArea,
  TreeSelect,
} from 'antdv-next';
import type { FormInstance } from 'antdv-next';
import {createRoleApi, updateRoleApi} from "#/api/system/role";

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
  type: 'add' | 'edit';
  data?: Partial<RoleInfo>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  type: 'add',
  data: () => ({}),
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// ==================== 状态定义 ====================

const formRef = ref<FormInstance>();
const loading = ref(false);
const okLoading = ref(false);
const deptTreeData = ref<OrgInfo[]>([]);

const formData = ref({
  id: '',
  roleName: '',
  code: '',
  deptId: '',
  remark: '',
});

// ==================== 计算属性 ====================

const modalTitle = $t(`system.role.${props.type === 'edit' ? 'editRole' : 'addRole'}`);

// Switch 状态绑定


// ==================== 表单规则 ====================

const rules = {
  roleName: [{ required: true, message: $t('system.role.roleNameRequired'), trigger: 'blur' }],
  deptId: [{ required: true, message: $t('system.role.organizationRequired'), trigger: 'change' }],
};

// ==================== 方法 ====================

const loadDeptTree = async () => {
  try {
    loading.value = true;
    const res = await getOrgTreeApi();
    deptTreeData.value = res || [];
  } catch (error) {
    console.error('获取部门树失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleOk = async () => {
  try {
    await formRef.value?.validate();
    okLoading.value = true;

    if (props.type === 'edit') {
      await updateRoleApi(formData.value);
      message.success($t('system.common.editSuccess'));
    } else {
      await createRoleApi(formData.value);
      message.success($t('system.common.addSuccess'));
    }

    emit('success');
    handleClose();
  } catch (error: any) {
    if (!error?.errorFields) {
      message.error(error?.message || '操作失败');
    }
  } finally {
    okLoading.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  formRef.value?.resetFields();
  formData.value = {
    id: '',
    roleName: '',
    code: '',
    deptId: '',
    remark: '',
  };
};

// ==================== 监听 ====================

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadDeptTree();
      formData.value = {
        id: props.data?.id || '',
        roleName: props.data?.roleName || '',
        code: props.data?.code || '',
        deptId: props.data?.deptId || '',
        remark: props.data?.remark || '',
      };
    }
  },
);
</script>

<template>
  <Modal
    :open="visible"
    :title="modalTitle"
    :width="500"
    :confirm-loading="okLoading"
    
    @ok="handleOk"
    @cancel="handleClose"
  >
    <Divider/>
    <Form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <FormItem :label="$t('system.role.roleName')" name="roleName">
        <Input
          v-model:value="formData.roleName"
          :placeholder="$t('system.role.roleNamePlaceholder')"
          allow-clear
          :maxlength="50"
        />
      </FormItem>

      <FormItem :label="$t('system.role.organization')" name="deptId">
        <TreeSelect
          v-model:value="formData.deptId"
          :tree-data="deptTreeData"
          :field-names="{ label: 'deptName', value: 'id', children: 'children' }"
          :placeholder="$t('system.role.organizationPlaceholder')"
          tree-default-expand-all
          allow-clear
          show-search
          :filter-tree-node="(searchValue: string, node: any) => node.deptName?.toLowerCase().includes(searchValue.toLowerCase())"
        />
      </FormItem>

    </Form>
  </Modal>
</template>
