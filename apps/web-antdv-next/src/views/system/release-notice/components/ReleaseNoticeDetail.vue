<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

defineOptions({ name: 'ReleaseNoticeDetail' });

type ReleaseNoticeStatus = 'draft' | 'published';

interface ReleaseNotice {
  content: string;
  createTime: string;
  description: string;
  id: string;
  publishTime: string;
  status: ReleaseNoticeStatus;
  title: string;
}

const detailData = ref<Partial<ReleaseNotice>>({});

const statusMap = computed<Record<ReleaseNoticeStatus, string>>(() => ({
  draft: $t('releaseNotice.status.draft'),
  published: $t('releaseNotice.status.published'),
}));

const allowedTags = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'col',
  'colgroup',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const allowedAttributes: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target', 'title']),
  col: new Set(['span', 'style', 'width']),
  img: new Set(['alt', 'height', 'src', 'style', 'title', 'width']),
  span: new Set(['style']),
  table: new Set(['style']),
  td: new Set(['colspan', 'rowspan', 'style']),
  th: new Set(['colspan', 'rowspan', 'style']),
};

const safeStyleProperties = new Set([
  'background-color',
  'color',
  'font-size',
  'font-weight',
  'height',
  'text-align',
  'width',
]);

function isSafeHref(value: string) {
  const trimmed = value.trim();
  return /^(?:https?:|mailto:|tel:|#|\/)/i.test(trimmed);
}

function isSafeImageSrc(value: string) {
  const trimmed = value.trim();
  return (
    /^https?:\/\//i.test(trimmed) ||
    /^data:image\/(?:bmp|gif|jpe?g|png|webp);base64,/i.test(trimmed)
  );
}

function sanitizeStyle(value: string) {
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf(':');
      if (separatorIndex === -1) return '';

      const property = item.slice(0, separatorIndex).trim().toLowerCase();
      const propertyValue = item.slice(separatorIndex + 1).trim();
      if (!safeStyleProperties.has(property)) return '';
      if (/expression|javascript:|url\s*\(/i.test(propertyValue)) return '';

      return `${property}: ${propertyValue}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeRichText(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  const html = String(value);

  if (typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const dangerousTags = new Set([
    'iframe',
    'link',
    'object',
    'script',
    'style',
  ]);

  const sanitizeNode = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (dangerousTags.has(tagName)) {
        element.remove();
        return;
      }

      if (!allowedTags.has(tagName)) {
        element.replaceWith(...element.childNodes);
        sanitizeNode(node);
        return;
      }

      const tagAllowedAttributes = allowedAttributes[tagName] ?? new Set();

      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const attributeValue = attribute.value;

        if (name.startsWith('on') || !tagAllowedAttributes.has(name)) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (tagName === 'a' && name === 'href') {
          if (!isSafeHref(attributeValue)) {
            element.removeAttribute(attribute.name);
            return;
          }

          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }

        if (
          tagName === 'img' &&
          name === 'src' &&
          !isSafeImageSrc(attributeValue)
        ) {
          element.removeAttribute(attribute.name);
        }

        if (name === 'style') {
          const safeStyle = sanitizeStyle(attributeValue);
          if (safeStyle) {
            element.setAttribute('style', safeStyle);
          } else {
            element.removeAttribute(attribute.name);
          }
        }
      });

      sanitizeNode(element);
    });
  };

  sanitizeNode(document.body);
  return document.body.innerHTML || '-';
}

const viewModel = computed(() => {
  const data = detailData.value;
  const displayText = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  return {
    content: sanitizeRichText(data.content),
    createTime: displayText(data.createTime),
    description: displayText(data.description),
    publishTime: displayText(data.publishTime),
    status: data.status ? statusMap.value[data.status] : '-',
    title: displayText(data.title),
  };
});

const [VbenModal, modalApi] = useVbenModal({
  class: 'w-[min(100%,760px)]',
  contentClass: 'p-0',
  destroyOnClose: true,
  title: $t('releaseNotice.modal.detailTitle'),
  onOpenChange(open: boolean) {
    if (!open) {
      detailData.value = {};
    }
  },
  onConfirm() {
    modalApi.close();
  },
  onCancel() {
    modalApi.close();
  },
});

function open(data: Partial<ReleaseNotice>) {
  detailData.value = { ...data };
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal :footer="false">
    <div class="flex w-full flex-col gap-5 p-6">
      <section class="flex flex-col gap-5">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('releaseNotice.fields.title') }}
            </label>
            <div
              class="flex min-h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.title }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('releaseNotice.fields.description') }}
            </label>
            <div
              class="flex min-h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.description }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('releaseNotice.fields.status') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ viewModel.status }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('releaseNotice.fields.createTime') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ viewModel.createTime }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('releaseNotice.fields.publishTime') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.publishTime }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('releaseNotice.fields.content') }}
            </label>
            <div
              class="min-h-20 rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[8px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <!-- eslint-disable vue/no-v-html -- content is sanitized above to preserve rich text, images, and links -->
              <div
                class="release-notice-rich-text text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                v-html="viewModel.content"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </VbenModal>
</template>

<style scoped>
.release-notice-rich-text {
  overflow-wrap: anywhere;
}

.release-notice-rich-text :deep(a) {
  color: hsl(var(--primary));
  text-decoration: underline;
}

.release-notice-rich-text :deep(blockquote) {
  margin: 8px 0;
  padding-left: 12px;
  border-left: 3px solid hsl(var(--border));
  color: rgba(0, 0, 0, 0.65);
}

.release-notice-rich-text :deep(h1),
.release-notice-rich-text :deep(h2),
.release-notice-rich-text :deep(h3),
.release-notice-rich-text :deep(h4),
.release-notice-rich-text :deep(h5),
.release-notice-rich-text :deep(h6) {
  margin: 12px 0 8px;
  font-weight: 600;
  line-height: 1.4;
}

.release-notice-rich-text :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 8px 0;
  border-radius: 4px;
}

.release-notice-rich-text :deep(ol),
.release-notice-rich-text :deep(ul) {
  margin: 8px 0;
  padding-left: 24px;
}

.release-notice-rich-text :deep(ol) {
  list-style: decimal;
}

.release-notice-rich-text :deep(ul) {
  list-style: disc;
}

.release-notice-rich-text :deep(p) {
  margin: 8px 0;
}

.release-notice-rich-text :deep(table) {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
}

.release-notice-rich-text :deep(td),
.release-notice-rich-text :deep(th) {
  padding: 6px 8px;
  border: 1px solid hsl(var(--border));
}

:global(.dark) .release-notice-rich-text :deep(blockquote) {
  color: rgba(255, 255, 255, 0.65);
}
</style>
