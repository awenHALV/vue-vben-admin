<script lang="ts" setup>
import type { UploadProps } from 'antdv-next';

import { h } from 'vue';

import { useVbenForm, useVbenModal, z } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { message } from 'antdv-next';

import { getUserImportTemplateUrl, importUserApi } from '#/api/system/user';

defineOptions({ name: 'UserImport' });

const emit = defineEmits<{
  success: [];
}>();

type UploadRequestOptions = Parameters<
  NonNullable<UploadProps['customRequest']>
>[0];

const handleDownloadTemplate = async () => {
  try {
    const blob = await getUserImportTemplateUrl();
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '用户导入模板.xlsx';
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('下载模板失败:', error);
    message.error('下载模板失败');
  }
};

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isValidType = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
  if (!isValidType) {
    message.error('只能上传 Excel 文件！');
    return false;
  }
  const isLt10M = (file.size ?? 0) / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('文件大小不能超过 10MB！');
    return false;
  }
  return true;
};

const formApiHolder: {
  api?: ReturnType<typeof useVbenForm>[1];
} = {};

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  footer: false,
  title: '批量导入',
  class: 'w-[min(100%,500px)]',
  async onOpenChange(open: boolean) {
    if (!open) {
      await formApiHolder.api?.resetForm();
    }
  },
});

async function handleUpload(options: UploadRequestOptions) {
  const { file, onSuccess, onError } = options;
  const formData = new FormData();
  formData.append('file', file as File);

  try {
    await importUserApi(formData);
    message.success('导入成功');
    onSuccess?.({}, file);
    emit('success');
    modalApi.close();
  } catch (error: unknown) {
    console.error('导入失败:', error);
    const err = error as { message?: string };
    message.error(err?.message || '导入失败');
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 100,
  },
  showDefaultActions: false,
  schema: [
    {
      component: 'Upload',
      fieldName: 'fileList',
      label: '模板上传',
      defaultValue: [],
      componentProps: () => ({
        accept: '.xls,.xlsx',
        maxCount: 1,
        beforeUpload,
        customRequest: handleUpload,
      }),
      // 使用这个属性来渲染组件内部的内容（即上传按钮）
      renderComponentContent: () => {
        return {
          default: () =>
            h(
              'button',
              {
                class:
                  'ant-btn css-var-v-0 ant-btn-default ant-btn-color-default ant-btn-variant-outlined',
              },
              [
                h(IconifyIcon, { icon: 'lucide:upload', class: 'size-4' }),
                h('span', '点击上传'),
              ],
            ),
        };
      },
      suffix: () =>
        h(
          'span',
          { class: 'text-muted-foreground text-xs' },
          '请上传 .xls, .xlsx 标准格式文件',
        ),
      rules: z.any().optional(),
    },
    {
      component: 'DefaultButton',
      fieldName: 'downloadAction',
      label: '模板下载',
      defaultValue: '',
      componentProps: {
        onClick: handleDownloadTemplate,
        icon: h(IconifyIcon, { icon: 'lucide:download', class: 'size-4' }),
      },
      renderComponentContent: () => ({
        default: () => '点击下载',
      }),
      rules: z.any().optional(),
    },
  ],
});
formApiHolder.api = formApi;

function open() {
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Form />
  </VbenModal>
</template>

<style>
/* 使用系统设置的圆角（通过 --radius CSS 变量） */
</style>
