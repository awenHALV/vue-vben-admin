<script lang="ts" setup>
/**
 * 行业资讯 - 新增/编辑弹窗
 * @author inspur-iep-ai
 */
import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '@vben/locales';

import { DatePicker, Form, FormItem, Input, Select } from 'antdv-next';
import dayjs from 'dayjs';

interface IndustryNews {
  id: string;
  title: string;
  category: 'news' | 'other' | 'policy' | 'report';
  source: string;
  url: string;
  publishTime: string;
}

const emit = defineEmits<{
  success: [data: IndustryNews];
}>();

// ==================== 表单数据 ====================
const formRef = ref<any>(null);
const isEdit = ref(false);

const formData = reactive<IndustryNews>({
  id: '',
  title: '',
  category: 'news',
  source: '',
  url: '',
  publishTime: dayjs().format('YYYY-MM-DD'),
});

// ==================== 选项 ====================
const categoryOptions = computed(() => [
  { label: $t('industryNews.category.policy'), value: 'policy' },
  { label: $t('industryNews.category.news'), value: 'news' },
  { label: $t('industryNews.category.report'), value: 'report' },
  { label: $t('industryNews.category.other'), value: 'other' },
]);

// ==================== 表单校验 ====================
const rules = computed(() => ({
  title: [
    {
      required: true,
      message: $t('industryNews.validation.titleRequired'),
      trigger: 'blur',
    },
    {
      max: 100,
      message: $t('industryNews.validation.titleMax'),
      trigger: 'blur',
    },
  ],
  category: [
    {
      required: true,
      message: $t('industryNews.validation.categoryRequired'),
      trigger: 'change',
    },
  ],
  source: [
    {
      required: true,
      message: $t('industryNews.validation.sourceRequired'),
      trigger: 'blur',
    },
  ],
  url: [
    {
      required: true,
      message: $t('industryNews.validation.urlRequired'),
      trigger: 'blur',
    },
    {
      validator: (_rule: any, value: string) => {
        if (!value) return Promise.resolve();
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(value)) {
          return Promise.reject(
            new Error($t('industryNews.validation.urlInvalid')),
          );
        }
        return Promise.resolve();
      },
      trigger: 'blur',
    },
  ],
  publishTime: [
    {
      required: true,
      message: $t('industryNews.validation.publishTimeRequired'),
      trigger: 'change',
    },
  ],
}));

// ==================== 方法 ====================
function resetForm() {
  formData.id = '';
  formData.title = '';
  formData.category = 'news';
  formData.source = '';
  formData.url = '';
  formData.publishTime = dayjs().format('YYYY-MM-DD');
}

function setFormData(data: IndustryNews) {
  formData.id = data.id;
  formData.title = data.title;
  formData.category = data.category;
  formData.source = data.source;
  formData.url = data.url;
  formData.publishTime = data.publishTime;
}

const [VbenModal, modalApi] = useVbenModal({
  class: 'w-[min(100%,600px)]',
  confirmLoading: false,
  confirmText: $t('industryNews.action.save'),
  destroyOnClose: true,
  showConfirmButton: true,
  // 点击弹窗外侧不关闭弹窗
  closeOnClickModal: false,
  title: $t('industryNews.modal.addTitle'),
  onCancel() {
    modalApi.close();
  },
  onOpenChange(open) {
    if (!open) {
      resetForm();
      formRef.value?.clearValidate?.();
    }
  },
  async onConfirm() {
    const valid = await formRef.value
      ?.validate()
      .then(() => true)
      .catch(() => false);

    if (!valid) {
      return;
    }

    modalApi.setState({ confirmLoading: true });
    try {
      // 模拟提交
      await new Promise((resolve) => setTimeout(resolve, 500));
      emit('success', { ...formData });
      modalApi.close();
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record?: IndustryNews) {
  isEdit.value = Boolean(record);
  resetForm();
  formRef.value?.clearValidate?.();

  if (record) {
    setFormData(record);
  }

  modalApi.setState({
    confirmText: isEdit.value
      ? $t('industryNews.action.save')
      : $t('industryNews.action.add'),
    title: isEdit.value
      ? $t('industryNews.modal.editTitle')
      : $t('industryNews.modal.addTitle'),
  });
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <!-- prettier-ignore -->
    <Form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <FormItem :label="$t('industryNews.fields.title')" name="title">
        <Input
          v-model:value="formData.title"
          :placeholder="$t('industryNews.placeholder.title')"
          maxlength="100"
          show-count
        />
      </FormItem>

      <FormItem :label="$t('industryNews.fields.category')" name="category">
        <Select
          v-model:value="formData.category"
          :placeholder="$t('industryNews.placeholder.category')"
          style="width: 100%"
          :options="categoryOptions"
        />
      </FormItem>

      <FormItem :label="$t('industryNews.fields.source')" name="source">
        <Input
          v-model:value="formData.source"
          :placeholder="$t('industryNews.placeholder.source')"
        />
      </FormItem>

      <FormItem :label="$t('industryNews.fields.url')" name="url">
        <Input
          v-model:value="formData.url"
          :placeholder="$t('industryNews.placeholder.url')"
        />
        <p class="form-hint">
          <IconifyIcon icon="lucide:info" />
          {{ $t('industryNews.tips.url') }}
        </p>
      </FormItem>

      <FormItem
        :label="$t('industryNews.fields.publishTime')"
        name="publishTime"
      >
        <DatePicker
          v-model:value="formData.publishTime"
          value-format="YYYY-MM-DD"
          :placeholder="$t('industryNews.placeholder.publishTime')"
          style="width: 100%"
        />
      </FormItem>
    </Form>
  </VbenModal>
</template>

<style scoped>
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
