<script lang="ts" setup>
import { computed, h, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { App, Button, Space, Tag, Tooltip } from 'antdv-next';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { usePageButtonAccess } from '#/composables/use-page-button-access';

import { RELEASE_NOTICE_PAGE_BUTTON_CODES } from './button-permissions';
import ReleaseNoticeDetail from './components/ReleaseNoticeDetail.vue';
import ReleaseNoticeModal from './components/ReleaseNoticeModal.vue';

defineOptions({ name: 'SystemReleaseNotice' });

const { modal } = App.useApp();
const { canButton } = usePageButtonAccess();

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

interface ReleaseNoticePageParams {
  current?: number;
  size?: number;
  title?: string;
}

const statusMap = computed<
  Record<
    ReleaseNoticeStatus,
    {
      color: string;
      label: string;
    }
  >
>(() => ({
  draft: { color: 'default', label: $t('releaseNotice.status.draft') },
  published: {
    color: 'success',
    label: $t('releaseNotice.status.published'),
  },
}));

const mockData = ref<ReleaseNotice[]>([
  {
    id: '1',
    title: 'V2.1.0 现货交易辅助模块上线',
    description:
      '本次更新聚焦现货交易场景，新增辅助决策功能和算法优化，提升交易效率和准确性。',
    content:
      '<p><strong>功能更新：</strong></p><ul><li>现货交易辅助决策功能：基于历史数据和实时行情，智能推荐交易策略</li><li>电价预测算法优化：采用深度学习模型，提升预测准确度至95%</li><li>结算报表导出功能增强：支持多格式导出，新增自定义字段配置</li></ul><p><strong>性能优化：</strong></p><ul><li>页面加载速度提升40%</li><li>大数据量场景下表格渲染性能优化</li></ul>',
    publishTime: '2025-06-01',
    status: 'published',
    createTime: '2025-05-28',
  },
  {
    id: '2',
    title: 'V2.0.5 热修复版本发布',
    description: '修复了结算报表导出异常问题，优化数据同步机制。',
    content:
      '<p><strong>修复内容：</strong></p><ul><li>结算报表导出异常：修复大数据量导出时的内存溢出问题</li><li>数据同步延迟：优化同步机制，降低延迟至1秒以内</li></ul>',
    publishTime: '2025-05-28',
    status: 'published',
    createTime: '2025-05-25',
  },
  {
    id: '3',
    title: 'V2.0.0 大版本更新',
    description: '全新工作台功能上线，重构用户界面，提升操作体验。',
    content:
      '<p><strong>全新特性：</strong></p><ul><li>工作台首页：个性化仪表盘，集中展示关键信息</li><li>自定义应用：支持创建快捷应用入口</li><li>消息中心：统一消息管理，重要通知不遗漏</li><li>交易日历：可视化展示交易任务和时间节点</li></ul>',
    publishTime: '',
    status: 'draft',
    createTime: '2025-05-01',
  },
]);

const searchTitle = ref('');
const releaseNoticeDetailRef = ref<InstanceType<
  typeof ReleaseNoticeDetail
> | null>(null);
const releaseNoticeModalRef = ref<InstanceType<
  typeof ReleaseNoticeModal
> | null>(null);

async function getReleaseNoticePage(params: ReleaseNoticePageParams) {
  let filteredData = [...mockData.value];

  if (params.title) {
    filteredData = filteredData.filter((item) =>
      item.title.includes(params.title ?? ''),
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

function getSearchPayload(): Partial<ReleaseNoticePageParams> {
  const payload: Partial<ReleaseNoticePageParams> = {};
  const title = searchTitle.value.trim();

  if (title) {
    payload.title = title;
  }

  return payload;
}

const [Grid, gridApi] = useVbenVxeGrid<ReleaseNotice>({
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
        title: $t('releaseNotice.fields.versionTitle'),
      },
      {
        field: 'description',
        minWidth: 260,
        slots: { default: 'description' },
        title: $t('releaseNotice.fields.description'),
      },
      {
        field: 'createTime',
        minWidth: 140,
        title: $t('releaseNotice.fields.createTime'),
      },
      {
        field: 'publishTime',
        minWidth: 140,
        title: $t('releaseNotice.fields.publishTime'),
      },
      {
        field: 'status',
        minWidth: 110,
        slots: { default: 'status' },
        title: $t('releaseNotice.fields.status'),
      },
      {
        align: 'center',
        fixed: 'right',
        slots: { default: 'action' },
        title: $t('releaseNotice.fields.action'),
        width: 280,
      },
    ],
    maxHeight: '100%',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getReleaseNoticePage({
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
  void reloadGrid();
}

function handleAdd() {
  releaseNoticeModalRef.value?.open();
}

function handleDetail(record: ReleaseNotice) {
  releaseNoticeDetailRef.value?.open({ ...record });
}

function handleEdit(record: ReleaseNotice) {
  releaseNoticeModalRef.value?.open({ ...record });
}

function handleDelete(record: ReleaseNotice) {
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

function handlePublish(record: ReleaseNotice) {
  mockData.value = mockData.value.map((item) => {
    if (item.id !== record.id) {
      return item;
    }

    const status = item.status === 'published' ? 'draft' : 'published';

    return {
      ...item,
      publishTime: status === 'published' ? dayjs().format('YYYY-MM-DD') : '',
      status,
    };
  });

  void reloadGrid();
}

function handleModalSuccess(data: ReleaseNotice) {
  if (data.id) {
    mockData.value = mockData.value.map((item) =>
      item.id === data.id ? { ...item, ...data } : item,
    );
  } else {
    mockData.value.unshift({
      ...data,
      createTime: dayjs().format('YYYY-MM-DD'),
      id: String(Date.now()),
      publishTime: '',
      status: 'draft',
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
            {{ $t('releaseNotice.fields.title') }}
          </span>
          <VbenInput
            v-model="searchTitle"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('releaseNotice.placeholder.title')"
            @keydown.enter="handleSearch"
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
            {{ $t('releaseNotice.action.reset') }}
          </VbenButton>
          <!-- prettier-ignore -->
          <VbenButton
            class="w-[60px]"
            size="sm"
            @click="handleSearch"
          >
            {{ $t('releaseNotice.action.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <div class="min-h-0 flex-1 rounded-lg border border-border bg-background">
      <Grid class="h-full min-h-0">
        <template #toolbar-actions>
          <div class="flex w-full items-center justify-between p-0 pb-2">
            <div class="text-base font-bold">
              {{ $t('releaseNotice.listTitle') }}
            </div>
            <!-- prettier-ignore -->
            <VbenButton
              v-if="canButton(RELEASE_NOTICE_PAGE_BUTTON_CODES.add)"
              class="w-[84px]"
              size="sm"
              @click="handleAdd"
            >
              <Plus class="mr-1 size-4" />
              {{ $t('releaseNotice.action.add') }}
            </VbenButton>
          </div>
        </template>

        <template #description="{ row }">
          <Tooltip :title="row.description">
            <span class="inline-block max-w-[260px] truncate align-bottom">
              {{ row.description }}
            </span>
          </Tooltip>
        </template>

        <template #status="{ row }">
          <Tag :color="statusMap[row.status].color">
            {{ statusMap[row.status].label }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <Button
              v-if="canButton(RELEASE_NOTICE_PAGE_BUTTON_CODES.detail)"
              type="link"
              size="small"
              class="text-primary"
              @click="handleDetail(row)"
            >
              {{ $t('releaseNotice.action.detail') }}
            </Button>
            <Button
              v-if="canButton(RELEASE_NOTICE_PAGE_BUTTON_CODES.edit)"
              type="link"
              size="small"
              class="text-primary"
              @click="handleEdit(row)"
            >
              {{ $t('releaseNotice.action.edit') }}
            </Button>
            <!-- prettier-ignore -->
            <Button
                v-if="canButton(RELEASE_NOTICE_PAGE_BUTTON_CODES.delete)"
                type="link"
                danger
                size="small"
                @click="handleDelete(row)"
              >
                {{ $t('releaseNotice.action.delete') }}
              </Button>
            <!-- prettier-ignore -->
            <Button
              v-if="canButton(RELEASE_NOTICE_PAGE_BUTTON_CODES.publish)"
              type="link"
              size="small"
              @click="handlePublish(row)"
            >
              {{
                row.status === 'published'
                  ? $t('releaseNotice.action.offline')
                  : $t('releaseNotice.action.publish')
              }}
            </Button>
          </Space>
        </template>
      </Grid>
    </div>

    <ReleaseNoticeModal
      ref="releaseNoticeModalRef"
      @success="handleModalSuccess"
    />
    <ReleaseNoticeDetail ref="releaseNoticeDetailRef" />
  </Page>
</template>
