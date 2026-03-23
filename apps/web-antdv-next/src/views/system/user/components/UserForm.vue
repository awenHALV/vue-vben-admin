<script lang="ts" setup>
import type { DeptTreeNode, RoleInfo, UserInfo } from '#/api/system/user';

import { computed, ref, watch } from 'vue';

import {
  createUserApi,
  getDeptTreeApi,
  getDeptRolesApi,
  editPasswordApi,
  updateUserApi,
} from '#/api/system/user';

import { $t } from '#/locales';
import { encryptByMd5 } from '#/utils/cipher';

import {
  Button,
  Col,
  Divider,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  Modal,
  Row,
  Select,
  TreeSelect,
} from 'antdv-next';
import type { FormInstance } from 'antdv-next';

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
  type: 'add' | 'edit' | 'passwordReset';
  data?: Partial<UserInfo>;
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
const deptTreeData = ref<DeptTreeNode[]>([]);
const roleList = ref<RoleInfo[]>([]);

const formData = ref({
  id: '',
  account: '',
  pwd: '',
  password2: '',
  name: '',
  phone: '',
  email: '',
  deptId: '',
  roleId: [] as string[],
  status: 1,
});

// ==================== 计算属性 ====================

const modalTitle = computed(() => {
  const titles = {
    add: $t('system.user.addUser'),
    edit: $t('system.user.editUser'),
    passwordReset: $t('system.user.editPassword'),
  };
  return titles[props.type];
});

const isAdd = computed(() => props.type === 'add');
const isEdit = computed(() => props.type === 'edit');
const isPasswordReset = computed(() => props.type === 'passwordReset');

// ==================== 表单规则 ====================

const rules = computed(() => {
  const baseRules: Record<string, any[]> = {
    account: [{ required: true, message: $t('system.user.accountRequired'), trigger: 'blur' }],
    name: [{ required: true, message: $t('system.user.nameRequired'), trigger: 'blur' }],
    phone: [
      { required: true, message: $t('system.user.phoneRequired'), trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: $t('system.user.phoneFormat'), trigger: 'blur' },
    ],
    email: [
      { type: 'email', message: $t('system.user.emailFormat'), trigger: 'blur' },
    ],
  };

  // 新增时的密码规则
  if (isAdd.value) {
    baseRules.pwd = [
      { required: true, message: $t('system.user.passwordRequired'), trigger: 'blur' },
      {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,32}$/,
        message: $t('system.user.passwordFormat'),
        trigger: 'blur',
      },
    ];
    baseRules.password2 = [
      { required: true, message: $t('system.user.confirmPassword'), trigger: 'blur' },
      {
        validator: (_: any, value: string) => {
          if (value !== formData.value.pwd) {
            return Promise.reject($t('system.user.passwordNotMatch'));
          }
          return Promise.resolve();
        },
        trigger: 'blur',
      },
    ];
  }

  // 密码重置时的规则
  if (isPasswordReset.value) {
    baseRules.pwd = [
      { required: true, message: $t('system.user.passwordRequired'), trigger: 'blur' },
      {
        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,32}$/,
        message: $t('system.user.passwordFormat'),
        trigger: 'blur',
      },
    ];
    baseRules.password2 = [
      { required: true, message: $t('system.user.confirmPassword'), trigger: 'blur' },
      {
        validator: (_: any, value: string) => {
          if (value !== formData.value.pwd) {
            return Promise.reject($t('system.user.passwordNotMatch'));
          }
          return Promise.resolve();
        },
        trigger: 'blur',
      },
    ];
  }

  // 非密码重置模式时的部门和角色规则
  if (!isPasswordReset.value) {
    baseRules.deptId = [{ required: true, message: $t('system.user.orgPlaceholder'), trigger: 'change' }];
    baseRules.roleId = [
      {
        required: true,
        validator: (_: any, value: string[]) => {
          if (!value || value.length === 0) {
            return Promise.reject($t('system.user.rolePlaceholder'));
          }
          return Promise.resolve();
        },
        trigger: 'change',
      },
    ];
  }

  // 编辑时的状态必填规则
  if (isEdit.value) {
    baseRules.status = [{ required: true, message: $t('system.common.selectPlaceholder'), trigger: 'change' }];

  }

  return baseRules;
});

// ==================== 方法 ====================

const loadDeptTree = async () => {
  try {
    const res = await getDeptTreeApi();
    deptTreeData.value = res || [];
  } catch (error) {
    console.error('获取部门树失败:', error);
  }
};

const loadRoles = async (deptId: string) => {
  if (!deptId) {
    roleList.value = [];
    return;
  }
  try {
    const res = await getDeptRolesApi(deptId);
    roleList.value = res || [];
  } catch (error) {
    console.error('获取角色列表失败:', error);
    roleList.value = [];
  }
};

const handleOk = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;
    if (isAdd.value) {
      await createUserApi({
        ...formData.value,
        pwd: encryptByMd5(formData.value.pwd),
        roleId: formData.value.roleId.join(','),
      });
      message.success($t('system.common.addSuccess'));
    } else if (isEdit.value) {
      await updateUserApi({
        ...formData.value,
        roleId: formData.value.roleId.join(','),
      });
      message.success($t('system.common.editSuccess'));
    } else if (isPasswordReset.value) {
      await editPasswordApi({
        id: formData.value.id,
        pwd: encryptByMd5(formData.value.pwd),
        phone: formData.value.phone,
      });
      message.success($t('system.user.editPassword') + $t('system.common.addSuccess'));
    }

    emit('success');
    handleClose();
  } catch (error: any) {
    console.error('操作失败:', error);
    if (error?.errorFields) {
      // 表单验证错误，不做处理
      return;
    }
    message.error(error?.message || '操作失败');
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  formRef.value?.resetFields();
  formData.value = {
    id: '',
    account: '',
    pwd: '',
    password2: '',
    name: '',
    phone: '',
    email: '',
    deptId: '',
    roleId: [],
    status: 1,
  };
};

const handleDeptChange = (value: string) => {
  formData.value.roleId = [];
  if (value) {
    loadRoles(value);
  }
  // 如果清空组织选择，不清空角色列表，让用户可以继续选择
};

// ==================== 监听 ====================

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadDeptTree();
      console.log('props.data', props.data)
      if (props.data) {
        formData.value = {
          id: props.data.id || '',
          account: props.data.account || '',
          pwd: '',
          password2: '',
          name: props.data.name || '',
          phone: props.data.phone || '',
          email: props.data.email || '',
          deptId: props.data.deptId || '',
          roleId: props.data.roleId ? props.data.roleId.split(',') : [],
          status: props.data.status == 1 ? 1 : 0,
        };
        if (props.data.deptId) {
          loadRoles(props.data.deptId);
        }
      }
    }
    console.log('formData.value', formData.value)
  },
);
</script>

<template>
  <Modal
    :open="visible"
    :title="modalTitle"
    :width="700"
    :confirm-loading="loading"
    class="system-modal-no-radius"
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
      <!-- 密码重置模式：只显示账号和密码 -->
      <template v-if="isPasswordReset">
        <FormItem :label="$t('system.user.account')" name="account">
          <Input v-model:value="formData.account" disabled />
        </FormItem>
        <FormItem :label="$t('system.user.password')" name="pwd">
          <InputPassword
            v-model:value="formData.pwd"
            :placeholder="$t('system.user.passwordPlaceholder')"
            :maxlength="20"
            allow-clear
          />
        </FormItem>
        <FormItem :label="$t('system.user.confirmPassword')" name="password2">
          <InputPassword
            v-model:value="formData.password2"
            :placeholder="$t('system.user.confirmPasswordPlaceholder')"
            :maxlength="20"
            allow-clear
          />
        </FormItem>
      </template>

      <!-- 新增/编辑模式 -->
      <template v-else>
            <FormItem :label="$t('system.user.account')" name="account" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <Input
                v-model:value="formData.account"
                :placeholder="$t('system.user.accountPlaceholder')"
                :disabled="isEdit"
                :maxlength="20"
                allow-clear
              />
            </FormItem>

        <FormItem
          v-if="isAdd"
          :label="$t('system.user.password')"
          :tooltip="$t('system.user.passwordFormat')"
          name="pwd"
          :label-col="{ span: 4 }"
          :wrapper-col="{ span: 20 }"
        >
          <InputPassword
              v-model:value="formData.pwd"
              :placeholder="$t('system.user.passwordPlaceholder')"
              :maxlength="20"
              allow-clear
          />
        </FormItem>
            <FormItem v-if="isAdd" :label="$t('system.user.confirmPassword')" name="password2" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <InputPassword
                v-model:value="formData.password2"
                :placeholder="$t('system.user.confirmPasswordPlaceholder')"
                :maxlength="20"
                allow-clear
              />
            </FormItem>
        <FormItem v-if="isEdit" :label="$t('system.common.status')" name="status" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
          <Select
              v-model:value="formData.status"
              :placeholder="$t('system.common.selectPlaceholder')"
              :options="[
                { label: $t('system.common.normal'), value: 1 },
                { label: $t('system.common.disabled'), value: 0 }
              ]"
              allow-clear
          />
        </FormItem>
            <FormItem :label="$t('system.user.name')" name="name" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
             <Input v-model:value="formData.name" :placeholder="$t('system.user.namePlaceholder')" :maxlength="20" allow-clear />
           </FormItem>
            <FormItem :label="$t('system.user.phone')" name="phone" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <Input v-model:value="formData.phone" :placeholder="$t('system.user.phonePlaceholder')" :maxlength="11" allow-clear />
            </FormItem>
            <FormItem :label="$t('system.user.email')" name="email" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
              <Input v-model:value="formData.email" :placeholder="$t('system.user.emailPlaceholder')" :maxlength="50" allow-clear />
            </FormItem>


        <FormItem :label="$t('system.user.org')" name="deptId" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
          <TreeSelect
            v-model:value="formData.deptId"
            :tree-data="deptTreeData"
            :field-names="{ label: 'deptName', value: 'id', children: 'children' }"
            :placeholder="$t('system.user.orgPlaceholder')"
            tree-default-expand-all
            allow-clear
            @change="handleDeptChange"
          />
        </FormItem>

        <FormItem :label="$t('system.user.role')" name="roleId" :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
          <Select
            v-model:value="formData.roleId"
            mode="multiple"
            :placeholder="$t('system.user.rolePlaceholder')"
            :options="roleList.map(r => ({ label: r.roleName, value: r.id }))"
            allow-clear
          />
        </FormItem>
      </template>
    </Form>
  </Modal>
</template>

<style>
.system-modal-no-radius .ant-btn,
.system-modal-no-radius .ant-input,
.system-modal-no-radius .ant-select-selector,
.system-modal-no-radius .ant-input-affix-wrapper,
.system-modal-no-radius .ant-input-password,
.system-modal-no-radius .ant-tree-select {
  border-radius: 0 !important;
}

.system-modal-no-radius .ant-select-focused .ant-select-selector,
.system-modal-no-radius .ant-select-selector:hover,
.system-modal-no-radius .ant-input:hover,
.system-modal-no-radius .ant-input:focus {
  border-radius: 0 !important;
}

.system-modal-no-radius.ant-modal,
.system-modal-no-radius .ant-modal-content {
  border-radius: 0 !important;
}

.system-modal-no-radius .ant-form-item-label {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.system-modal-no-radius .ant-form-item-label > label {
  justify-content: flex-end;
}
</style>
