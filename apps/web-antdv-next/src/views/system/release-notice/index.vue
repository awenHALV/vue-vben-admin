<script lang="ts" setup>
import type {
  ReleaseNoticeItem,
  ReleaseNoticePageParams,
  ReleaseNoticeStatus,
} from '#/api/system/release-notice';

import { computed, h, ref } from 'vue';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { IconifyIcon, Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { App, Button, Space, Tag, Tooltip } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteReleaseNoticeApi,
  getReleaseNoticeDetailApi,
  getReleaseNoticePageApi,
  publishReleaseNoticeApi,
  unpublishReleaseNoticeApi,
} from '#/api/system/release-notice';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import emitter from '#/utils/mitt';

import { RELEASE_NOTICE_PAGE_BUTTON_CODES } from './button-permissions';
import ReleaseNoticeDetail from './components/ReleaseNoticeDetail.vue';
import ReleaseNoticeModal from './components/ReleaseNoticeModal.vue';

defineOptions({ name: 'SystemReleaseNotice' });

const { modal } = App.useApp();
const { canButton } = usePageButtonAccess();

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

const searchTitle = ref('');
const releaseNoticeDetailRef = ref<InstanceType<
  typeof ReleaseNoticeDetail
> | null>(null);
const releaseNoticeModalRef = ref<InstanceType<
  typeof ReleaseNoticeModal
> | null>(null);

function getSearchPayload(): Partial<ReleaseNoticePageParams> {
  const payload: Partial<ReleaseNoticePageParams> = {};
  const title = searchTitle.value.trim();

  if (title) {
    payload.title = title;
  }

  return payload;
}

const [Grid, gridApi] = useVbenVxeGrid<ReleaseNoticeItem>({
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
          return await getReleaseNoticePageApi({
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

async function handleDetail(record: ReleaseNoticeItem) {
  const detail = await getReleaseNoticeDetailApi(record.id);
  releaseNoticeDetailRef.value?.open(detail);
}

function handleEdit(record: ReleaseNoticeItem) {
  releaseNoticeModalRef.value?.open({ ...record });
}

function handleDelete(record: ReleaseNoticeItem) {
  modal.confirm({
    title: $t('releaseNotice.tips.deleteConfirm'),
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
      await deleteReleaseNoticeApi(record.id);
      await reloadGrid();
      // 通知工作台刷新
      emitter.emit('release-notice-update');
    },
  });
}

async function handlePublish(record: ReleaseNoticeItem) {
  await (record.status === 'published'
    ? unpublishReleaseNoticeApi(record.id)
    : publishReleaseNoticeApi(record.id));
  await reloadGrid();
  emitter.emit('release-notice-update');
}

function handleModalSuccess() {
  void reloadGrid();
  emitter.emit('release-notice-update');
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
              :disabled="row.status === 'published'"
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
                :disabled="row.status === 'published'"
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
