<script lang="ts" setup>
import type { SelectProps } from 'antdv-next';

import type {
  IndustryNewsCategory,
  IndustryNewsItem,
  IndustryNewsPageParams,
} from '#/api/system/industry-news';

import { computed, h, onMounted, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { App, Button, message, Select, Space, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDictOptionsApi } from '#/api/system/dict';
import {
  deleteIndustryNewsApi,
  getIndustryNewsDetailApi,
  getIndustryNewsPageApi,
} from '#/api/system/industry-news';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import emitter from '#/utils/mitt';

import { INDUSTRY_NEWS_PAGE_BUTTON_CODES } from './button-permissions';
import IndustryNewsDetail from './components/IndustryNewsDetail.vue';
import IndustryNewsModal from './components/IndustryNewsModal.vue';

defineOptions({ name: 'SystemIndustryNews' });
const { modal } = App.useApp();
const { canButton } = usePageButtonAccess();

const categoryOptions = ref<SelectProps['options']>([]);

const categoryMap = computed<Record<string, { color: string; label: string }>>(
  () => {
    const colorMap: Record<IndustryNewsCategory | string, string> = {
      industry_news: 'orange',
      other: 'default',
      policy_release: 'blue',
      market_report: 'green',
    };

    const map: Record<string, { color: string; label: string }> = {};
    for (const option of categoryOptions.value ?? []) {
      const value = String(option.value ?? '');
      if (value) {
        map[value] = {
          color: colorMap[value] ?? 'default',
          label: String(option.label ?? value),
        };
      }
    }
    return map;
  },
);

const searchTitle = ref('');
const searchCategory = ref<string>();
const industryNewsDetailRef = ref<InstanceType<
  typeof IndustryNewsDetail
> | null>(null);
const industryNewsModalRef = ref<InstanceType<typeof IndustryNewsModal> | null>(
  null,
);

function getSearchPayload(): Partial<IndustryNewsPageParams> {
  const payload: Partial<IndustryNewsPageParams> = {};
  const title = searchTitle.value.trim();

  if (title) {
    payload.title = title;
  }

  if (searchCategory.value) {
    payload.newsType = searchCategory.value;
  }

  return payload;
}

const [Grid, gridApi] = useVbenVxeGrid<IndustryNewsItem>({
  gridClass: 'p-6 pt-4',
  gridOptions: {
    columns: [
      {
        field: 'title',
        minWidth: 220,
        showOverflow: true,
        title: $t('industryNews.fields.title'),
      },
      {
        field: 'category',
        minWidth: 120,
        slots: { default: 'category' },
        title: $t('industryNews.fields.category'),
      },
      {
        field: 'source',
        minWidth: 160,
        title: $t('industryNews.fields.source'),
      },
      {
        field: 'publishTime',
        minWidth: 140,
        title: $t('industryNews.fields.publishTime'),
      },
      {
        align: 'center',
        fixed: 'right',
        slots: { default: 'action' },
        title: $t('industryNews.fields.action'),
        width: 220,
      },
    ],
    maxHeight: '100%',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getIndustryNewsPageApi({
            ...formValues,
            current: page.currentPage,
            size: page.pageSize,
          });
        },
      },
    },
    rowConfig: {
      height: 46,
      isHover: true,
    },
  },
  separator: false,
  showSearchForm: false,
});

async function reloadGrid() {
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadGrid();
}

function handleReset() {
  searchTitle.value = '';
  searchCategory.value = undefined;
  void reloadGrid();
}

function handleAdd() {
  industryNewsModalRef.value?.open();
}

function getCategoryColor(category: string) {
  return (
    categoryMap.value[category as IndustryNewsCategory]?.color ?? 'default'
  );
}

function getCategoryLabel(row: IndustryNewsItem) {
  return (
    categoryMap.value[row.category as IndustryNewsCategory]?.label ??
    row.newsTypeLabel ??
    row.category
  );
}

async function handleDetail(record: IndustryNewsItem) {
  const detail = await getIndustryNewsDetailApi(record.id);
  industryNewsDetailRef.value?.open(detail, categoryOptions.value);
}

function handleEdit(record: IndustryNewsItem) {
  industryNewsModalRef.value?.open({ ...record });
}

function handleDelete(record: IndustryNewsItem) {
  modal.confirm({
    title: $t('industryNews.tips.deleteConfirm'),
    content: $t('industryNews.tips.deleteContent'),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    icon: h(
      'span',
      {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          marginRight: '12px',
        },
      },
      [
        h(IconifyIcon, {
          icon: 'ant-design:exclamation-circle-filled',
          style: { color: '#FF4D4F', fontSize: '22px' },
        }),
      ],
    ),
    async onOk() {
      await deleteIndustryNewsApi(record.id);
      await reloadGrid();
      message.success($t('releaseNotice.message.deleteSuccess'));
      // 通知工作台刷新
      emitter.emit('industry-new-update');
    },
  });
}

function handleModalSuccess() {
  void reloadGrid();
  // 通知工作台刷新
  emitter.emit('industry-new-update');
}

async function loadCategoryOptions() {
  const options = await getDictOptionsApi('sys_news_type');
  categoryOptions.value = options.map((item) => ({
    label: item.optionValue,
    value: item.optionKey,
  }));
}

onMounted(() => {
  void loadCategoryOptions();
});
</script>

<template>
  <Page
    :auto-content-height="true"
    content-class="flex min-h-0 flex-col gap-3 p-4"
  >
    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background p-6"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">
            {{ $t('industryNews.fields.title') }}
          </span>
          <VbenInput
            v-model="searchTitle"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('industryNews.placeholder.title')"
            @keydown.enter="handleSearch"
          />
        </div>
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">
            {{ $t('industryNews.fields.category') }}
          </span>
          <Select
            v-model:value="searchCategory"
            allow-clear
            class="w-40"
            :options="categoryOptions"
            :placeholder="$t('industryNews.placeholder.category')"
          />
        </div>
      </div>
      <div class="ml-auto flex shrink-0 items-center justify-end">
        <Space>
          <VbenButton
            class="w-[60px]"
            size="sm"
            variant="outline"
            @click="handleReset"
          >
            {{ $t('industryNews.action.reset') }}
          </VbenButton>
          <!-- prettier-ignore -->
          <VbenButton
            class="w-[60px]"
            size="sm"
            @click="handleSearch"
          >
            {{ $t('industryNews.action.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <div
      class="industry-news-grid min-h-0 flex-1 rounded-lg border border-border bg-background"
    >
      <Grid class="h-full min-h-0">
        <template #toolbar-actions>
          <div class="flex w-full items-center justify-between p-0 pb-2">
            <div class="text-base font-bold">
              {{ $t('industryNews.listTitle') }}
            </div>
            <!-- prettier-ignore -->
            <VbenButton
              v-if="canButton(INDUSTRY_NEWS_PAGE_BUTTON_CODES.add)"
              class="w-[84px]"
              size="sm"
              @click="handleAdd"
            >
              <Plus class="mr-1 size-4" />
              {{ $t('industryNews.action.add') }}
            </VbenButton>
          </div>
        </template>

        <template #category="{ row }">
          <Tag :color="getCategoryColor(row.category)">
            {{ getCategoryLabel(row) }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button
              v-if="canButton(INDUSTRY_NEWS_PAGE_BUTTON_CODES.detail)"
              type="link"
              size="small"
              class="text-primary"
              @click="handleDetail(row)"
            >
              {{ $t('industryNews.action.detail') }}
            </Button>
            <Button
              v-if="canButton(INDUSTRY_NEWS_PAGE_BUTTON_CODES.edit)"
              type="link"
              size="small"
              class="text-primary"
              @click="handleEdit(row)"
            >
              {{ $t('industryNews.action.edit') }}
            </Button>
            <!-- prettier-ignore -->
            <Button
              v-if="canButton(INDUSTRY_NEWS_PAGE_BUTTON_CODES.delete)"
              type="link"
              danger
              size="small"
              @click="handleDelete(row)"
            >
              {{ $t('industryNews.action.delete') }}
            </Button>
          </Space>
        </template>
      </Grid>
    </div>

    <IndustryNewsModal
      ref="industryNewsModalRef"
      @success="handleModalSuccess"
    />
    <IndustryNewsDetail ref="industryNewsDetailRef" />
  </Page>
</template>

<style>
.industry-news-grid :deep(.vxe-table--empty-place-wrapper) {
  height: 150px !important;
}
</style>
