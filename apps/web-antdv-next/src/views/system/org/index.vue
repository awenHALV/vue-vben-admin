<script lang="ts" setup>
import type { OrgInfo } from '#/api/system/org';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'antdv-next';
import type { TableColumnsType } from 'antdv-next';

import { deleteOrgApi, getOrgTreeApi } from '#/api/system/org';
import OrgForm from './components/OrgForm.vue';

// ==================== 状态定义 ====================

const loading = ref(false);
const tableData = ref<OrgInfo[]>([]);

// 搜索表单
const searchForm = reactive({
  deptName: '',
});

// 弹窗状态
const formVisible = ref(false);
const formType = ref<'add' | 'edit' | 'addChild'>('add');
const formData = ref<Partial<OrgInfo> & { parentInternal?: string }>({});
const rootId = ref('');

// ==================== 表格列定义 ====================

const columns: TableColumnsType = [
  {
    title: $t('system.org.orgName'),
    dataIndex: 'deptName',
    width: 200,
    align: 'center',
    ellipsis: true,
  },
  // {
  //   title: $t('system.org.orgAttribute'),
  //   dataIndex: 'internal',
  //   width: 120,
  //   align: 'center',
  //   ellipsis: true,
  // },
  {
    title: $t('system.common.remarks'),
    dataIndex: 'remark',
    width: 200,
    align: 'center',
    ellipsis: true,
  },
  {
    title: $t('system.common.operation'),
    key: 'action',
    width: 200,
    align: 'center',
    fixed: 'right',
  },
];

// ==================== 方法 ====================

const getTableData = async () => {
  try {
    loading.value = true;
    const res = await getOrgTreeApi(searchForm);
    tableData.value = res || [];
    if (tableData.value.length > 0) {
      rootId.value = tableData.value[0].id;
    }
  } catch (error) {
    console.error('获取组织列表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  getTableData();
};

const handleReset = () => {
  searchForm.deptName = '';
  getTableData();
};


const handleEdit = (record: OrgInfo) => {
  formType.value = 'edit';
  formData.value = { ...record };
  formVisible.value = true;
};

const handleAddChild = (record: OrgInfo) => {
  formType.value = 'addChild';
  formData.value = {
    parentId: record.id,
    parentInternal: record.internal == null ? "" : record.internal,
  };
  formVisible.value = true;
};

const handleDelete = async (record: OrgInfo) => {
  if (record.parentId === '0' || !record.parentId) {
    message.warning('根组织不能删除');
    return;
  }

  Modal.confirm({
    title: $t('system.org.deleteTip'),
    content: $t('system.org.deleteContent'),
    okText: $t('system.common.ok'),
    cancelText: $t('system.common.cancel'),
    onOk: async () => {
      try {
        await deleteOrgApi([record.id]);
        message.success($t('system.common.deleteSuccess'));
        getTableData();
      } catch (error: any) {
        message.error(error?.message || $t('system.common.deleteFailed'));
      }
    },
  });
};

const handleFormSuccess = () => {
  formVisible.value = false;
  getTableData();
};

// ==================== 生命周期 ====================

onMounted(() => {
  getTableData();
});
</script>

<template>
  <Page auto-content-height :title="$t('system.org.title')">
    <div class="flex flex-col h-full gap-4">
      <!-- 搜索表单 -->
      <Card>
        <div class="flex justify-between items-start">
          <Form layout="inline">
            <FormItem :label="$t('system.org.orgName')">
              <Input
                v-model:value="searchForm.deptName"
                :placeholder="$t('system.org.orgNamePlaceholder')"
                allow-clear
                style="width: 240px"
              />
            </FormItem>
          </Form>
          <Space>
            <Button type="primary" class="w-21" @click="handleSearch">
              <template #icon><IconifyIcon icon="lucide:search" /></template>
              {{ $t('system.common.search') }}
            </Button>
            <Button class="w-21" @click="handleReset">
              <template #icon><IconifyIcon icon="lucide:rotate-ccw" /></template>
              {{ $t('system.common.reset') }}
            </Button>
          </Space>
        </div>
      </Card>

      <!-- 组织列表 -->
      <Card class="flex-1 min-h-0">
        <Table
          :columns="columns"
          :data-source="tableData"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 700 }"
          row-key="id"
          size="middle"
          :default-expand-all-rows="true"
        >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'internal'">
            <Tag v-if="record.internal" color="blue">{{ record.internal }}</Tag>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <a @click="handleEdit(record)">{{ $t('system.common.edit') }}</a>
              <a
                :style="(!record.parentId || record.parentId === '0') ? { color: '#9ca3af', cursor: 'not-allowed' } : { color: '#ef4444' }"
                @click="handleDelete(record)"
              >
                {{ $t('system.common.delete') }}
              </a>
              <a @click="handleAddChild(record)">{{ $t('system.org.addSubitem') }}</a>
            </Space>
          </template>
        </template>
        </Table>
      </Card>
    </div>

    <!-- 组织表单弹窗 -->
    <OrgForm
      v-model:visible="formVisible"
      :type="formType"
      :data="formData"
      :root-id="rootId"
      @success="handleFormSuccess"
    />
  </Page>
</template>

<style scoped>
/* 使用系统设置的圆角（通过 --radius CSS 变量） */
</style>
