<script lang="ts" setup>
import type { OrgInfo, OrgTreeNode } from '#/api/system/org';
import type { DictOption } from '#/api/system/dict';

import { computed, ref, watch } from 'vue';

import { $t } from '#/locales';

import {
  Button, Divider,
  Form, FormInstance,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  TextArea,
  TreeSelect,
} from 'antdv-next';
// import type { FormInstance } from 'ant-design-vue';
import { createOrgApi, getOrgTreeApi, updateOrgApi } from '#/api/system/org';
import { getDictOptionsApi } from '#/api/system/dict';

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
  type: 'add' | 'edit' | 'addChild';
  data?: Partial<OrgInfo> & { parentInternal?: string };
  rootId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  type: 'add',
  data: () => ({}),
  rootId: '',
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// ==================== 状态定义 ====================

const formRef = ref<FormInstance>();
const loading = ref(false);
const okLoading = ref(false);
const orgTreeData = ref<OrgTreeNode[]>([]);
const internalOptions = ref<DictOption[]>([]);

const formData = ref({
  id: '',
  deptName: '',
  parentId: '',
  internal: '',
  code: '',
  remark: '',
});

// ==================== 计算属性 ====================

const modalTitle = computed(() => {
  if (props.type === 'edit') {
    return $t('system.org.editOrg');
  }
  return $t('system.org.addOrg');
});

const isEdit = computed(() => props.type === 'edit');
const isAdd = computed(() => props.type === 'add');
const isAddChild = computed(() => props.type === 'addChild');

// ==================== 表单规则 ====================

const rules = computed(() => {
  const baseRules: Record<string, any[]> = {
    deptName: [{ required: true, message: $t('system.org.orgNameRequired'), trigger: 'blur' }],
    parentId : [{ required: true, message: $t('system.org.parentOrgPlaceholder'), trigger: 'change' }],
  };

  // 新增组织时，上级组织和组织属性必填
  if (isAdd.value) {
    baseRules.parentId = [{ required: true, message: $t('system.org.parentOrgPlaceholder'), trigger: 'change' }];
    baseRules.internal = [{ required: true, message: $t('system.org.orgAttributePlaceholder'), trigger: 'change' }];
  }

  // 添加子组织时，组织属性必填
  if (isAddChild.value) {
    baseRules.internal = [{ required: true, message: $t('system.org.orgAttributePlaceholder'), trigger: 'change' }];
  }

  return baseRules;
});

// ==================== 方法 ====================

const loadOrgTree = async () => {
  try {
    const res = await getOrgTreeApi();
    orgTreeData.value = res || [];
  } catch (error) {
    console.error('获取组织树失败:', error);
  }
};

const loadInternalOptions = async () => {
  try {
    const res = await getDictOptionsApi('de_base_dept_internal');
    internalOptions.value = res || [];
  } catch (error) {
    console.error('获取组织属性字典失败:', error);
    // 使用默认值作为兜底
    internalOptions.value = [
      { optionKey: 'company', optionValue: '公司' },
      { optionKey: 'department', optionValue: '部门' },
    ];
  }
};

const handleOk = async () => {
  try {
    await formRef.value?.validate();
    okLoading.value = true;

    if (props.type === 'edit') {
      await updateOrgApi(formData.value);
      message.success($t('system.common.editSuccess'));
    } else {
      const data = {
        ...formData.value,
        internal: formData.value.internal || props.data?.parentInternal,
      };
      await createOrgApi(data);
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
    deptName: '',
    parentId: '',
    internal: '',
    code: '',
    remark: '',
  };
};

// ==================== 监听 ====================

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadOrgTree();
      loadInternalOptions();
      formData.value = {
        id: props.data?.id || '',
        deptName: props.data?.deptName || '',
        parentId: props.data?.parentId || '',
        internal: props.data?.internal || '',
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
    :width="600"
    :confirm-loading="okLoading"
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
      <FormItem :label="$t('system.org.orgName')" name="deptName">
        <Input
          v-model:value="formData.deptName"
          :placeholder="$t('system.org.orgNamePlaceholder')"
          allow-clear
          :maxlength="50"
        />
      </FormItem>

      <!-- 上级组织：新增时显示且可编辑，添加子组织时显示但禁用，编辑时隐藏 -->
      <FormItem
        v-if="!isEdit"
        :label="$t('system.org.parentOrg')"
        name="parentId"
      >
        <TreeSelect
          v-model:value="formData.parentId"
          :tree-data="orgTreeData"
          :field-names="{ label: 'deptName', value: 'id', children: 'children' }"
          :placeholder="$t('system.org.parentOrgPlaceholder')"
          tree-default-expand-all
          allow-clear
          :disabled="isAddChild"
        />
      </FormItem>

      <!-- 组织属性：新增和添加子组织时必填，编辑时禁用 -->
<!--      <FormItem-->
<!--        :label="$t('system.org.orgAttribute')"-->
<!--        name="internal"-->
<!--      >-->
<!--        <Select-->
<!--          v-model:value="formData.internal"-->
<!--          :placeholder="$t('system.org.orgAttributePlaceholder')"-->
<!--          :options="internalOptions.map(item => ({ label: item.optionValue, value: item.optionKey }))"-->
<!--          allow-clear-->
<!--          :disabled="isEdit"-->
<!--        />-->
<!--      </FormItem>-->

      <FormItem :label="$t('system.common.remarks')" name="remark">
        <TextArea
          v-model:value="formData.remark"
          :placeholder="$t('system.org.remarksPlaceholder')"
          :auto-size="{ minRows: 2 }"
          :maxlength="200"
          show-count
          allow-clear
        />
      </FormItem>
    </Form>
  </Modal>
</template>

<style>
.system-modal-no-radius .ant-btn,
.system-modal-no-radius .ant-input,
.system-modal-no-radius .ant-select-selector,
.system-modal-no-radius .ant-input-affix-wrapper,
.system-modal-no-radius .ant-input-number,
.system-modal-no-radius .ant-tree-select,
.system-modal-no-radius textarea.ant-input {
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
</style>
