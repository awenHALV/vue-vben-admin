<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

defineOptions({ name: 'IndustryNewsDetail' });

type IndustryNewsCategory = 'news' | 'other' | 'policy' | 'report';

interface IndustryNews {
  category: IndustryNewsCategory;
  createTime: string;
  id: string;
  publishTime: string;
  source: string;
  title: string;
  url: string;
}

const detailData = ref<Partial<IndustryNews>>({});

const categoryMap = computed<Record<IndustryNewsCategory, string>>(() => ({
  news: $t('industryNews.category.news'),
  other: $t('industryNews.category.other'),
  policy: $t('industryNews.category.policy'),
  report: $t('industryNews.category.report'),
}));

const viewModel = computed(() => {
  const data = detailData.value;
  const displayText = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  };

  return {
    category: data.category ? categoryMap.value[data.category] : '-',
    publishTime: displayText(data.publishTime),
    source: displayText(data.source),
    title: displayText(data.title),
    url: displayText(data.url),
  };
});

const [VbenModal, modalApi] = useVbenModal({
  class: 'w-[min(100%,700px)]',
  contentClass: 'p-0',
  destroyOnClose: true,
  title: $t('industryNews.modal.detailTitle'),
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

function open(data: Partial<IndustryNews>) {
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
              {{ $t('industryNews.fields.title') }}
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
              {{ $t('industryNews.fields.category') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.category }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('industryNews.fields.source') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.source }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('industryNews.fields.url') }}
            </label>
            <div
              class="flex min-h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <a
                v-if="detailData.url"
                class="text-sm leading-[22px] break-all text-primary"
                :href="detailData.url"
                rel="noopener noreferrer"
                target="_blank"
              >
                {{ viewModel.url }}
              </a>
              <span
                v-else
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.url }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('industryNews.fields.publishTime') }}
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
        </div>
      </section>
    </div>
  </VbenModal>
</template>
