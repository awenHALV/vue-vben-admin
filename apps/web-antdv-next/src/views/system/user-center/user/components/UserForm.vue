<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { DeptTreeNode, RoleInfo, UserInfo } from '#/api/system/user';

import { ref } from 'vue';

import { useVbenForm, useVbenModal, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import {
  createUserApi,
  editPasswordApi,
  getDeptRolesApi,
  getDeptTreeApi,
  updateUserApi,
} from '#/api/system/user';
import { $t } from '#/locales';
import { encryptByMd5 } from '#/utils/cipher';

defineOptions({ name: 'UserForm' });

const emit = defineEmits<{
  success: [];
}>();

const currentType = ref<'add' | 'edit' | 'passwordReset'>('add');
const currentData = ref<Partial<UserInfo>>({});

const deptTreeData = ref<DeptTreeNode[]>([]);
const roleList = ref<RoleInfo[]>([]);

/**
 * 与角色下拉已联动的部门 id。仅当用户把部门改成「不同 id」时才清空角色；
 * 避免 setValues / TreeSelect 二次渲染在下一 tick 触发 handleValuesChange 误清空回显。
 */
const lastDeptIdLinkedToRoles = ref<string | undefined>(undefined);

type UserFormApi = ReturnType<typeof useVbenForm>[1];

/** 按部门刷新角色下拉（表单 API 作参数，避免 useVbenForm 初始化时的循环引用） */
async function syncRoleFieldOptions(api: UserFormApi, deptId: string) {
  if (!deptId) {
    roleList.value = [];
    await api.updateSchema([
      {
        fieldName: 'roleId',
        componentProps: { options: [] },
      },
    ]);
    return;
  }
  try {
    const res = await getDeptRolesApi(deptId);
    roleList.value = res || [];
    await api.updateSchema([
      {
        fieldName: 'roleId',
        componentProps: {
          options: roleList.value.map((r) => ({
            label: r.roleName,
            value: `${r.id}`,
          })),
        },
      },
    ]);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    roleList.value = [];
    await api.updateSchema([
      {
        fieldName: 'roleId',
        componentProps: { options: [] },
      },
    ]);
  }
}

function buildModalTitle(type: 'add' | 'edit' | 'passwordReset'): string {
  if (type === 'passwordReset') {
    return $t('system.user.editPassword');
  }
  if (type === 'edit') {
    return $t('system.user.editUser');
  }
  return $t('system.user.addUser');
}

function normalizeRoleFieldValue(roleId: UserInfo['roleId']): string[] {
  if (roleId === undefined || roleId === null || roleId === '') {
    return [];
  }
  if (Array.isArray(roleId)) {
    return roleId.map(String);
  }
  return String(roleId).split(',').filter(Boolean);
}

const passwordComplexityRule = z
  .string()
  .min(1, $t('system.user.passwordRequired'))
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/,
    $t('system.user.passwordFormat'),
  );

function schemaAccountField(accountDisabled: boolean) {
  return {
    component: 'Input' as const,
    componentProps: {
      disabled: accountDisabled,
      maxlength: 20,
      placeholder: $t('system.user.accountPlaceholder'),
    },
    fieldName: 'account',
    label: $t('system.user.account'),
    rules: z.string().min(1, $t('system.user.accountRequired')),
  };
}

function schemaPasswordPair() {
  return [
    {
      component: 'InputPassword' as const,
      componentProps: {
        maxlength: 20,
        placeholder: $t('system.user.passwordPlaceholder'),
      },
      fieldName: 'pwd',
      label: $t('system.user.password'),
      rules: passwordComplexityRule,
    },
    {
      component: 'InputPassword' as const,
      componentProps: {
        maxlength: 20,
        placeholder: $t('system.user.confirmPasswordPlaceholder'),
      },
      fieldName: 'password2',
      label: $t('system.user.confirmPassword'),
      rules: z.string().min(1, $t('system.user.confirmPassword')),
    },
  ];
}

function schemaNamePhoneEmail() {
  return [
    {
      component: 'Input' as const,
      componentProps: {
        maxlength: 20,
        placeholder: $t('system.user.namePlaceholder'),
      },
      fieldName: 'name',
      label: $t('system.user.name'),
      rules: z.string().min(1, $t('system.user.nameRequired')),
    },
    {
      component: 'Input' as const,
      componentProps: {
        maxlength: 11,
        placeholder: $t('system.user.phonePlaceholder'),
      },
      fieldName: 'phone',
      label: $t('system.user.phone'),
      rules: z.string().min(1, $t('system.user.phoneRequired')),
    },
    {
      component: 'Input' as const,
      componentProps: {
        maxlength: 50,
        placeholder: $t('system.user.emailPlaceholder'),
      },
      fieldName: 'email',
      label: $t('system.user.email'),
      required: false,
      rules: z.preprocess(
        (val) => (val === undefined || val === null ? '' : String(val)),
        z.union([
          z.literal(''),
          z.string().email($t('system.user.emailFormat')),
        ]),
      ),
    },
  ];
}

function schemaDeptAndRole() {
  return [
    {
      component: 'TreeSelect' as const,
      componentProps: {
        allowClear: true,
        style: { width: '100%' },
        fieldNames: { label: 'deptName', value: 'id', children: 'children' },
        placeholder: $t('system.user.orgPlaceholder'),
        treeData: deptTreeData.value,
        treeDefaultExpandAll: true,
      },
      fieldName: 'deptId',
      label: $t('system.user.org'),
      rules: z.string().min(1, $t('system.user.orgPlaceholder')),
    },
    {
      component: 'Select' as const,
      componentProps: {
        style: { width: '100%' },
        allowClear: true,
        mode: 'multiple',
        options: roleList.value.map((r) => ({
          label: r.roleName,
          value: String(r.id),
        })),
        placeholder: $t('system.user.rolePlaceholder'),
      },
      fieldName: 'roleId',
      label: $t('system.user.role'),
      rules: z.array(z.string()).min(1, $t('system.user.rolePlaceholder')),
    },
  ];
}

const userStatusOptions = ref<any[]>([]);

function schemaStatusField() {
  const isEdit = currentType.value === 'edit';
  return {
    component: 'Select' as const,
    componentProps: {
      style: { width: '100%' },
      disabled: isEdit && currentData.value.status === 2,
      options: userStatusOptions.value.map((opt) => ({
        label: opt.optionValue,
        value: Number(opt.optionKey),
        disabled: isEdit && opt.optionValue === '待激活',
      })),
      placeholder: $t('system.common.selectPlaceholder'),
    },
    fieldName: 'status',
    label: $t('system.common.status'),
    rules: z.number().min(0, {
      message: $t('system.common.selectPlaceholder'),
    }),
  };
}

/**
 * 新增：账号 → 密码 → 确认密码 → 姓名 → 手机 → 邮箱 → 组织 → 角色（8 项）
 * 编辑：账号 → 姓名 → 手机 → 邮箱 → 组织 → 角色 → 状态（7 项）
 * 修改密码：账号 → 密码 → 确认密码（3 项）
 */
function buildFormSchema() {
  const type = currentType.value;

  if (type === 'passwordReset') {
    return [schemaAccountField(true), ...schemaPasswordPair()];
  }

  if (type === 'add') {
    return [
      schemaAccountField(false),
      ...schemaPasswordPair(),
      ...schemaNamePhoneEmail(),
      ...schemaDeptAndRole(),
    ];
  }

  return [
    schemaAccountField(true),
    schemaStatusField(),
    ...schemaNamePhoneEmail(),
    ...schemaDeptAndRole(),
  ];
}

const formApiRef: { current?: UserFormApi } = {};

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 100,
  },
  schema: buildFormSchema(),
  showDefaultActions: false,
  handleValuesChange: async (values, changedFields) => {
    if (!changedFields.includes('deptId')) {
      return;
    }
    const api = formApiRef.current;
    if (!api) {
      return;
    }
    const newDeptId = String(values.deptId ?? '');
    if (newDeptId === lastDeptIdLinkedToRoles.value) {
      return;
    }
    lastDeptIdLinkedToRoles.value = newDeptId;
    await syncRoleFieldOptions(api, newDeptId);
    await api.setFieldValue('roleId', []);
  },
});
formApiRef.current = formApi;

async function loadDeptTree() {
  try {
    const res = await getDeptTreeApi();
    deptTreeData.value = res || [];
  } catch (error) {
    console.error('获取部门树失败:', error);
  }
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showConfirmButton: true,
  confirmLoading: false,
  title: $t('system.user.addUser'),
  onOpenChange: async (open: boolean) => {
    if (!open) return;

    /** 先重置 */
    await formApi.resetForm();
    lastDeptIdLinkedToRoles.value = undefined;
    const mode = currentType.value;

    modalApi.setState({
      title: buildModalTitle(mode),
    });

    if (mode !== 'passwordReset') {
      await loadDeptTree();
    }

    /** 整表替换 schema；updateSchema 只合并已有项，无法去掉密码/组织等字段 */
    formApi.setState({ schema: buildFormSchema() });

    const row = currentData.value;
    const hasRowData =
      row &&
      Object.keys(row).length > 0 &&
      Boolean(
        row.id ||
        row.account ||
        row.deptId ||
        row.name ||
        row.roleId ||
        row.phone ||
        row.email,
      );

    if (hasRowData) {
      if (mode === 'passwordReset') {
        await formApi.setValues({
          id: row.id || '',
          account: row.account || '',
        });
      } else {
        if (row.deptId) {
          lastDeptIdLinkedToRoles.value = String(row.deptId);
          await syncRoleFieldOptions(formApi, row.deptId);
        }
        await formApi.setValues({
          id: row.id || '',
          account: row.account || '',
          name: row.name || '',
          phone: row.phone || '',
          email: row.email || '',
          deptId: row.deptId || '',
          roleId: normalizeRoleFieldValue(row.roleId),
          status: row.status === undefined ? 1 : row.status,
        });
      }
    }

    await formApi.resetValidate();
  },
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = await formApi.getValues();

    if (currentType.value === 'add' && values.pwd !== values.password2) {
      message.error($t('system.user.passwordNotMatch'));
      return;
    }

    if (
      currentType.value === 'passwordReset' &&
      values.pwd !== values.password2
    ) {
      message.error($t('system.user.passwordNotMatch'));
      return;
    }

    modalApi.setState({ confirmLoading: true });
    try {
      switch (currentType.value) {
        case 'add': {
          await createUserApi({
            ...values,
            pwd: encryptByMd5(values.pwd),
            roleId: values.roleId.join(','),
          });
          message.success($t('system.common.addSuccess'));

          break;
        }
        case 'edit': {
          await updateUserApi({
            id: currentData.value.id,
            ...values,
            roleId: values.roleId.join(','),
          });
          message.success($t('system.common.editSuccess'));

          break;
        }
        case 'passwordReset': {
          await editPasswordApi({
            id: String(currentData.value.id),
            pwd: encryptByMd5(values.pwd),
            password2: encryptByMd5(values.password2),
          });
          message.success(
            $t('system.user.editPassword') + $t('system.common.addSuccess'),
          );

          break;
        }
        // No default
      }

      modalApi.close();
      emit('success');
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(
  type: 'add' | 'edit' | 'passwordReset',
  data?: Partial<UserInfo>,
  statusOptions: any[] = [],
) {
  currentType.value = type;
  currentData.value = data ? { ...data } : {};
  userStatusOptions.value = statusOptions;
  modalApi.setState({
    title: buildModalTitle(type),
  });
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Form />
  </VbenModal>
</template>
