<script lang="ts" setup>
import type { SelectProps } from 'antdv-next';

import { computed, h, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { App, Button, Select, Space, Tag } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { usePageButtonAccess } from '#/composables/use-page-button-access';

import { INDUSTRY_NEWS_PAGE_BUTTON_CODES } from './button-permissions';
import IndustryNewsDetail from './components/IndustryNewsDetail.vue';
import IndustryNewsModal from './components/IndustryNewsModal.vue';

defineOptions({ name: 'SystemIndustryNews' });
const { modal } = App.useApp();
const { canButton } = usePageButtonAccess();

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

interface IndustryNewsPageParams {
  category?: string;
  current?: number;
  size?: number;
  title?: string;
}

const categoryOptions = computed<SelectProps['options']>(() => [
  { label: $t('industryNews.category.policy'), value: 'policy' },
  { label: $t('industryNews.category.news'), value: 'news' },
  { label: $t('industryNews.category.report'), value: 'report' },
  { label: $t('industryNews.category.other'), value: 'other' },
]);

const categoryMap = computed<
  Record<
    IndustryNewsCategory,
    {
      color: string;
      label: string;
    }
  >
>(() => ({
  news: { color: 'green', label: $t('industryNews.category.news') },
  other: { color: 'default', label: $t('industryNews.category.other') },
  policy: { color: 'blue', label: $t('industryNews.category.policy') },
  report: { color: 'orange', label: $t('industryNews.category.report') },
}));

const mockData = ref<IndustryNews[]>([
  {
    id: '1',
    title: '国家能源局发布新型电力系统建设指导意见',
    category: 'policy',
    source: '国家能源局',
    url: 'https://example.com/news/1',
    publishTime: '2024-01-15',
    createTime: '2024-01-15 10:00:00',
  },
  {
    id: '2',
    title: '2024年电力市场交易规模持续扩大',
    category: 'news',
    source: '中国电力报',
    url: 'https://example.com/news/2',
    publishTime: '2024-01-14',
    createTime: '2024-01-14 14:30:00',
  },
  {
    id: '3',
    title: '新能源消纳能力分析报告',
    category: 'report',
    source: '电力规划设计总院',
    url: 'https://example.com/news/3',
    publishTime: '2024-01-13',
    createTime: '2024-01-13 09:15:00',
  },
  {
    id: '4',
    title: '虚拟电厂参与电力市场交易试点启动',
    category: 'news',
    source: '能源新闻网',
    url: 'https://example.com/news/4',
    publishTime: '2024-01-12',
    createTime: '2024-01-12 16:45:00',
  },
  {
    id: '5',
    title: '电力现货市场基本规则解读',
    category: 'policy',
    source: '发改委',
    url: 'https://example.com/news/5',
    publishTime: '2024-01-11',
    createTime: '2024-01-11 11:20:00',
  },
  {
    id: '6',
    title: '储能技术发展趋势研究',
    category: 'report',
    source: '清华大学能源研究院',
    url: 'https://example.com/news/6',
    publishTime: '2024-01-10',
    createTime: '2024-01-10 08:30:00',
  },
]);

const searchTitle = ref('');
const searchCategory = ref<string>();
const industryNewsDetailRef = ref<InstanceType<
  typeof IndustryNewsDetail
> | null>(null);
const industryNewsModalRef = ref<InstanceType<typeof IndustryNewsModal> | null>(
  null,
);

async function getIndustryNewsPage(params: IndustryNewsPageParams) {
  let filteredData = [...mockData.value];

  if (params.title) {
    filteredData = filteredData.filter((item) =>
      item.title.includes(params.title ?? ''),
    );
  }

  if (params.category) {
    filteredData = filteredData.filter(
      (item) => item.category === params.category,
    );
  }

  const current = params.current ?? 1;
  const size = params.size ?? 10;
  const start = (current - 1) * size;

  return {
    items: filteredData.slice(start, start + size),
    total: filteredData.length,
  };
}

function getSearchPayload(): Partial<IndustryNewsPageParams> {
  const payload: Partial<IndustryNewsPageParams> = {};
  const title = searchTitle.value.trim();

  if (title) {
    payload.title = title;
  }

  if (searchCategory.value) {
    payload.category = searchCategory.value;
  }

  return payload;
}

const [Grid, gridApi] = useVbenVxeGrid<IndustryNews>({
  gridClass: 'p-6 pt-4',
  gridOptions: {
    checkboxConfig: {
      highlight: true,
      range: true,
    },
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
          return await getIndustryNewsPage({
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

function handleDetail(record: IndustryNews) {
  industryNewsDetailRef.value?.open({ ...record });
}

function handleEdit(record: IndustryNews) {
  industryNewsModalRef.value?.open({ ...record });
}

function handleDelete(record: IndustryNews) {
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
    onOk: () => {
      mockData.value = mockData.value.filter((item) => item.id !== record.id);
      void reloadGrid();
    },
  });
}

function handleModalSuccess(data: IndustryNews) {
  if (data.id) {
    mockData.value = mockData.value.map((item) =>
      item.id === data.id ? { ...item, ...data } : item,
    );
  } else {
    mockData.value.unshift({
      ...data,
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      id: Date.now().toString(),
    });
  }

  void reloadGrid();
}
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

    <div class="min-h-0 flex-1 rounded-lg border border-border bg-background">
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
          <Tag :color="categoryMap[row.category].color">
            {{ categoryMap[row.category].label }}
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
