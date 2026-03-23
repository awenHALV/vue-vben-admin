<script lang="ts" setup>
import { ref } from 'vue';

import {Button, Divider, Form, FormItem, message, Modal, Upload} from 'antdv-next';
import type { UploadProps } from 'antdv-next';

import { getUserImportTemplateUrl, importUserApi } from '#/api/system/user';

// ==================== Props & Emits ====================

interface Props {
  visible: boolean;
}

withDefaults(defineProps<Props>(), {
  visible: false,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [];
}>();

// ==================== 状态定义 ====================

const loading = ref(false);
const fileList = ref<any[]>([]);

// ==================== 方法 ====================

const handleDownloadTemplate = () => {
  const url = getUserImportTemplateUrl();
  window.open(url, '_blank');
};

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isValidType = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
  if (!isValidType) {
    message.error('只能上传 Excel 文件！');
    return false;
  }
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB！');
    return false;
  }
  return true;
};

const handleUpload = async (options: any) => {
  const { file } = options;
  const formData = new FormData();
  formData.append('file', file);

  try {
    loading.value = true;
    await importUserApi(formData);
    message.success('导入成功');
    emit('success');
    handleClose();
  } catch (error: any) {
    console.error('导入失败:', error);
    message.error(error?.message || '导入失败');
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  fileList.value = [];
};
</script>

<template>
  <Modal
    :open="visible"
    title="批量导入"
    :width="500"
    :footer="null"
    class="system-modal-no-radius"
    @cancel="handleClose"
  >
    <Divider/>
    <Form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <FormItem label="模板上传">
        <Upload
            v-model:file-list="fileList"
            :before-upload="beforeUpload"
            :custom-request="handleUpload"
            accept=".xls,.xlsx"
            :max-count="1"
        >
          <Button :loading="loading">点击上传</Button>  <span class="mt-2 text-gray-400 text-xs">
          请上传 .xls, .xlsx 标准格式文件
        </span>
        </Upload>

      </FormItem>
      <FormItem label="模板下载">
        <Button type="primary" @click="handleDownloadTemplate">
          点击下载
        </Button>
      </FormItem>

    </Form>
  </Modal>
</template>

<style>
.system-modal-no-radius .ant-btn {
  border-radius: 0 !important;
}

.system-modal-no-radius.ant-modal,
.system-modal-no-radius .ant-modal-content {
  border-radius: 0 !important;
}
</style>
