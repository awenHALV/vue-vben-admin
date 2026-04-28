<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { TableColumnsType, TablePaginationConfig } from 'antdv-next';

import type { FileLogVo } from '#/api/core/download';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Alert, Button, message, Table, Tag, Tooltip } from 'antdv-next';

import { getDownloadPageApi } from '#/api/core/download';
import { $t } from '#/locales';

// 表格数据
const tableData = ref<FileLogVo[]>([]);
const loading = ref(false);

// 分页配置
const current = ref(1);
const pageSize = ref(10);

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  defaultCurrent: 1,
  defaultPageSize: 10,
  pageSize: 10,
  pageSizeOptions: ['10', '20', '50', '100'],
  showQuickJumper: true,
  showSizeChanger: true,
  showTotal: (totalNum: number) => $t('page.downloadCenter.total', [totalNum]),
  total: 0,
});

// 状态映射 - 字典 sys_file_generate_status
// 0-生成中, 1-已完成, 2-生成失败
const statusMap: Record<string, string> = {
  '0': $t('page.downloadCenter.generating'),
  '1': $t('page.downloadCenter.completed'),
  '2': $t('page.downloadCenter.failed'),
};

const statusColorMap: Record<string, string> = {
  '0': 'processing',
  '1': 'success',
  '2': 'error',
};

// 表格列配置
const columns: TableColumnsType<FileLogVo> = [
  {
    dataIndex: 'fileName',
    ellipsis: true,
    title: $t('page.downloadCenter.fileName'),
    width: '40%',
  },
  {
    align: 'center',
    dataIndex: 'status',
    title: $t('page.downloadCenter.fileStatus'),
    width: '20%',
  },
  {
    align: 'center',
    dataIndex: 'generateTime',
    title: $t('page.downloadCenter.generateTime'),
    width: '25%',
  },
  {
    align: 'center',
    dataIndex: 'action',
    fixed: 'right',
    title: $t('system.common.operation'),
    width: '15%',
  },
];

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getDownloadPageApi({
      current: current.value,
      size: pageSize.value,
    });
    tableData.value = res.records;
    pagination.total = res.total;
    pagination.current = current.value;
    pagination.pageSize = pageSize.value;
  } finally {
    loading.value = false;
  }
}

// 分页变化
function handleTableChange(pag: TablePaginationConfig) {
  current.value = pag.current || 1;
  pageSize.value = pag.pageSize || 10;
  loadData();
}

// 处理下载
function handleDownload(row: FileLogVo) {
  // 只有已完成状态(status='1')才能下载
  if (row.status !== '1' || !row.fileLink) {
    return;
  }
  const xhr = new XMLHttpRequest();
  xhr.open('get', row.fileLink);
  xhr.responseType = 'blob';
  xhr.send();
  xhr.addEventListener('load', function () {
    if (this.status === 200 || this.status === 304) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(this.response);
      fileReader.addEventListener('load', function () {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = this.result;
        a.download = row.fileName;
        document.body.append(a);
        a.click();
        a.remove();
        message.success($t('page.downloadCenter.downloadSuccess'));
      });
    }
  });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page :title="$t('page.downloadCenter.title')" auto-content-height>
    <div class="flex h-full flex-col gap-4 bg-background p-6">
      <!-- 提示信息 -->
      <Alert
        :message="$t('page.downloadCenter.usageTip')"
        closable
        type="info"
      />
      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        :row-key="(record: FileLogVo) => record.id"
        :scroll="{ y: 'calc(100vh - 400px)' }"
        @change="handleTableChange"
      >
        <!-- 自定义表头 -->
        <template #headerCell="{ column }">
          <template v-if="column.dataIndex === 'status'">
            <div class="flex-center gap-1">
              {{ $t('page.downloadCenter.fileStatus') }}
              <Tooltip :title="$t('page.downloadCenter.refresh')">
                <IconifyIcon
                  :class="{ 'animate-spin': loading }"
                  class="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  icon="ant-design:reload-outlined"
                  @click="loadData"
                />
              </Tooltip>
            </div>
          </template>
          <template v-else>
            {{ column.title }}
          </template>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <Tag :color="statusColorMap[record.status] || 'default'">
              {{ statusMap[record.status] || record.status }}
            </Tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <Button
              :disabled="record.status !== '1'"
              type="link"
              @click="handleDownload(record)"
            >
              {{ $t('page.downloadCenter.download') }}
            </Button>
          </template>
        </template>
      </Table>
    </div>
  </Page>
</template>
