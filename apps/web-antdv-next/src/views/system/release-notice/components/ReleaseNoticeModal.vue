<script lang="ts" setup>
/**
 * 发版通知 - 新增/编辑弹窗
 * @author inspur-iep-ai
 */
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig,
} from '@wangeditor/editor';

import type { ReleaseNoticeItem } from '#/api/system/release-notice';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  shallowRef,
} from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t, i18n } from '@vben/locales';

import {
  createEditor,
  createToolbar,
  i18nChangeLanguage,
} from '@wangeditor/editor';
import { Form, FormItem, Input, message } from 'antdv-next';

import {
  createReleaseNoticeApi,
  toReleaseNoticeCreateParams,
  toReleaseNoticeUpdateParams,
  updateReleaseNoticeApi,
} from '#/api/system/release-notice';

import '@wangeditor/editor/dist/css/style.css';

const emit = defineEmits<{
  success: [];
}>();

// ==================== 表单数据 ====================
const formRef = ref<any>(null);
const isEdit = ref(false);
const editorRef = shallowRef<IDomEditor | null>(null);
const editorContainerRef = ref<HTMLElement | null>(null);
const toolbarContainerRef = ref<HTMLElement | null>(null);
let toolbar: null | ReturnType<typeof createToolbar> = null;
let isInitializingEditor = false;
const MAX_LOCAL_IMAGE_SIZE = 5 * 1024 * 1024;

const formData = reactive<ReleaseNoticeItem>({
  id: '',
  title: '',
  description: '',
  content: '',
  createTime: '',
  publishTime: '',
  status: 'draft',
});

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('error', () => {
      reject(reader.error);
    });
    reader.addEventListener('load', () => {
      resolve(String(reader.result ?? ''));
    });
    reader.readAsDataURL(file);
  });
}

function hasRichTextContent(editor: IDomEditor | null) {
  const html = editor?.getHtml() ?? formData.content;
  const text = editor
    ? editor.getText().trim()
    : html.replaceAll(/<[^>]*>/g, '').trim();

  return Boolean(text || /<(?:img|table|video)\b/i.test(html));
}

// ==================== 表单校验 ====================
const rules = computed(() => ({
  title: [
    {
      required: true,
      message: $t('releaseNotice.validation.titleRequired'),
      trigger: 'blur',
    },
  ],
  content: [
    {
      validator: async () => {
        if (!hasRichTextContent(editorRef.value)) {
          throw new Error($t('releaseNotice.validation.contentRequired'));
        }
      },
      trigger: 'blur',
    },
  ],
}));

// ==================== 方法 ====================
function destroyEditor() {
  toolbar?.destroy();
  toolbar = null;
  editorRef.value?.destroy();
  editorRef.value = null;
  isInitializingEditor = false;
}

function syncWangEditorLanguage() {
  i18nChangeLanguage(
    i18n.global.locale.value.startsWith('en') ? 'en' : 'zh-CN',
  );
}

function initEditor() {
  if (
    editorRef.value ||
    !editorContainerRef.value ||
    !toolbarContainerRef.value
  ) {
    return;
  }

  isInitializingEditor = true;
  syncWangEditorLanguage();

  const editorConfig: Partial<IEditorConfig> = {
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string) => void) {
          if (file.size > MAX_LOCAL_IMAGE_SIZE) {
            message.error($t('releaseNotice.validation.imageSizeLimit'));
            return;
          }

          insertFn(await fileToDataUrl(file));
        },
      },
    },
    placeholder: $t('releaseNotice.placeholder.content'),
    onBlur: () => {
      formRef.value?.validateFields?.(['content']);
    },
    onChange(editor) {
      formData.content = editor.getHtml();

      if (!isInitializingEditor) {
        formRef.value?.clearValidate?.(['content']);
      }
    },
  };

  const toolbarConfig: Partial<IToolbarConfig> = {
    excludeKeys: ['fullScreen'],
  };

  editorRef.value = createEditor({
    config: editorConfig,
    html: formData.content,
    mode: 'default',
    selector: editorContainerRef.value,
  });

  toolbar = createToolbar({
    config: toolbarConfig,
    editor: editorRef.value,
    mode: 'default',
    selector: toolbarContainerRef.value,
  });

  editorRef.value.enable();
  isInitializingEditor = false;
  formRef.value?.clearValidate?.(['content']);
}

function syncEditorContent() {
  const editor = editorRef.value;

  if (editor && editor.getHtml() !== formData.content) {
    editor.setHtml(formData.content);
  }
}

function resetForm() {
  formData.id = '';
  formData.title = '';
  formData.description = '';
  formData.content = '';
  formData.createTime = '';
  formData.publishTime = '';
  formData.status = 'draft';
}

function setFormData(data: ReleaseNoticeItem) {
  formData.id = data.id;
  formData.title = data.title;
  formData.description = data.description;
  formData.content = data.content;
  formData.createTime = data.createTime;
  formData.publishTime = data.publishTime;
  formData.status = data.status;
}

const [VbenModal, modalApi] = useVbenModal({
  class: 'w-[min(100%,900px)]',
  confirmLoading: false,
  confirmText: $t('releaseNotice.action.save'),
  destroyOnClose: true,
  showConfirmButton: true,
  // 点击弹窗外侧不关闭弹窗
  closeOnClickModal: false,
  title: $t('releaseNotice.modal.addTitle'),
  onCancel() {
    modalApi.close();
  },
  async onOpenChange(open) {
    if (!open) {
      resetForm();
      formRef.value?.clearValidate?.();
      destroyEditor();
      return;
    }

    await nextTick();
    window.setTimeout(() => {
      initEditor();
      syncEditorContent();
      formRef.value?.clearValidate?.(['content']);
    }, 0);
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
      await (isEdit.value
        ? updateReleaseNoticeApi(toReleaseNoticeUpdateParams(formData))
        : createReleaseNoticeApi(toReleaseNoticeCreateParams(formData)));
      emit('success');
      message.success($t('releaseNotice.message.saveSuccess'));
      modalApi.close();
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
});

function open(record?: ReleaseNoticeItem) {
  isEdit.value = Boolean(record);
  resetForm();
  formRef.value?.clearValidate?.();

  if (record) {
    setFormData(record);
  }

  modalApi.setState({
    confirmText: isEdit.value
      ? $t('releaseNotice.action.save')
      : $t('releaseNotice.action.add'),
    title: isEdit.value
      ? $t('releaseNotice.modal.editTitle')
      : $t('releaseNotice.modal.addTitle'),
  });
  modalApi.open();
}

onBeforeUnmount(() => {
  destroyEditor();
});

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
      <FormItem :label="$t('releaseNotice.fields.title')" name="title">
        <Input
          v-model:value="formData.title"
          :placeholder="$t('releaseNotice.placeholder.titleWithExample')"
          maxlength="100"
          show-count
        />
      </FormItem>

      <FormItem :label="$t('releaseNotice.fields.descriptionEdit')">
        <Input.TextArea
          v-model:value="formData.description"
          :placeholder="$t('releaseNotice.placeholder.description')"
          :rows="3"
          maxlength="200"
          show-count
        />
      </FormItem>

      <FormItem
        :label="$t('releaseNotice.fields.content')"
        name="content"
        required
      >
        <div class="release-editor">
          <div ref="toolbarContainerRef" class="release-editor__toolbar"></div>
          <div ref="editorContainerRef" class="release-editor__content"></div>
        </div>
        <p class="editor-hint">
          <IconifyIcon icon="lucide:info" />
          {{ $t('releaseNotice.tips.richText') }}
        </p>
      </FormItem>
    </Form>
  </VbenModal>
</template>

<style scoped>
.editor-hint {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.release-editor {
  overflow: visible;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.dark .release-editor {
  border-color: hsl(var(--border));
}

.dark .release-editor,
.dark :deep(.w-e-bar),
.dark :deep(.w-e-text-container),
.dark :deep(.w-e-drop-panel),
.dark :deep(.w-e-modal),
.dark :deep(.w-e-select-list),
.dark :deep(.w-e-bar-item-group .w-e-bar-item-menus-container) {
  --w-e-textarea-bg-color: hsl(var(--background));
  --w-e-textarea-color: hsl(var(--foreground));
  --w-e-textarea-border-color: hsl(var(--border));
  --w-e-textarea-slight-border-color: hsl(var(--border));
  --w-e-textarea-slight-color: hsl(var(--muted-foreground));
  --w-e-textarea-slight-bg-color: hsl(var(--muted));
  --w-e-toolbar-color: hsl(var(--foreground));
  --w-e-toolbar-bg-color: hsl(var(--background));
  --w-e-toolbar-active-color: hsl(var(--foreground));
  --w-e-toolbar-active-bg-color: hsl(var(--accent));
  --w-e-toolbar-disabled-color: hsl(var(--muted-foreground));
  --w-e-toolbar-border-color: hsl(var(--border));
  --w-e-modal-button-bg-color: hsl(var(--muted));
  --w-e-modal-button-border-color: hsl(var(--border));
}

.light :deep(.w-e-text-container) {
  --w-e-textarea-bg-color: hsl(var(--background));
}

/* 强行让顶部的工具栏左上、右上拥有圆角 */
.release-editor :deep(.w-e-toolbar) {
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
}

/* 强行让底部的编辑器主体左下、右下拥有圆角 */
.release-editor :deep(.w-e-text-container) {
  border-bottom-right-radius: 5px;
  border-bottom-left-radius: 5px;
}

.release-editor__toolbar {
  border-bottom: 1px solid #f0f0f0;
}

.dark .release-editor__toolbar {
  border-bottom-color: hsl(var(--border));
}

.release-editor__content {
  min-height: 300px;
}

:deep(.w-e-bar-item-group .w-e-bar-item-menus-container),
:deep(.w-e-drop-panel),
:deep(.w-e-modal),
:deep(.w-e-select-list) {
  z-index: 1100;
}

:deep(.release-editor__content .w-e-text-container) {
  min-height: 300px;
}
</style>
