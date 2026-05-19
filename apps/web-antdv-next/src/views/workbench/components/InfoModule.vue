<script lang="ts" setup>
import type { IndustryNewsItem } from '#/api/system/industry-news';
import type { ReleaseNoticeItem } from '#/api/system/release-notice';
import type { WorkbenchMessageItem } from '#/api/workbench';

import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { getTabKey, useTabbarStore } from '@vben/stores';

import { Card, Drawer, Empty, TabPane, Tabs, Tag } from 'antdv-next';

import { getIndustryNewsListApi } from '#/api/system/industry-news';
import { getPublishedReleaseNoticeListApi } from '#/api/system/release-notice';
import { getRevenueSchemeShareMessageListApi } from '#/api/workbench';
import { $t } from '#/locales';
import emitter from '#/utils/mitt';

// import {useMenu} from '@vben/core/menu-ui'

const router = useRouter();
const tabbarStore = useTabbarStore();

// 待办中心当前激活的标签
const activeTodoTab = ref('all');

// 消息中心当前激活的标签
const activeMessageTab = ref('all');

// ==================== 待办中心 ====================
interface TodoItem {
  id: string;
  title: string;
  initiator: string;
  time: string;
  status: string;
}

const approvalTodos = ref<TodoItem[]>([
  {
    id: '1',
    title: 'VPP-20260401结算单复核申请',
    initiator: '张三',
    time: '2025-06-09 14:35:28',
    status: '审批',
  },
  {
    id: '2',
    title: '储能站接入审批',
    initiator: '李四',
    time: '2025-06-09 14:15:42',
    status: '审批',
  },
  {
    id: '3',
    title: '电价调整方案审批',
    initiator: '王五',
    time: '2025-06-09 13:45:10',
    status: '审批',
  },
]);

const workorderTodos = ref<TodoItem[]>([
  {
    id: '1',
    title: '星火储能站1号柜离线排查',
    initiator: '系统',
    time: '2025-06-09 14:35:28',
    status: '工单',
  },
  {
    id: '2',
    title: '光伏逆变器定期巡检',
    initiator: '系统',
    time: '2025-06-09 13:35:15',
    status: '工单',
  },
]);

// ==================== 消息中心 ====================
interface MessageItem {
  content?: string;
  id: string;
  time: string;
  title: string;
  type: string;
}
// 修改子应用apps/web-antdv-next/src/views/analysis-revenue/energyStorageProject/plan/index.vue
// const route = useRoute();
// // 项目ID（同步从 store 获取，确保组件创建时就有值）
// const projectId = ref<null | string>(
//   (() => {
//     const data = routeTransferStore.getProjectData();
//     return route.query.projectId
//       ? String(route.query.projectId)
//       : data?.projectId
//         ? String(data.projectId)
//         : null;
//   })(),
// );
// 系统消息 - 统一模板：xxx项目xxx方案已完成，请查看。
const systemMessages = ref<WorkbenchMessageItem[]>([]);

// 发版通知 - 后台配置
const releaseNotices = ref<ReleaseNoticeItem[]>([]);

const noticeDrawerVisible = ref(false);
const currentNotice = ref<null | ReleaseNoticeItem>(null);

function openNoticeDetail(notice: ReleaseNoticeItem) {
  currentNotice.value = notice;
  noticeDrawerVisible.value = true;
}

// 告警消息：接口文档未提供对应端点，暂保留静态占位数据。
const alarmMessages = ref<MessageItem[]>([
  {
    id: '1',
    title: '储能PCS响应延迟超过2秒',
    content: '储能站#3 PCS设备响应延迟超过阈值',
    time: '2025-06-09 14:35:28',
    type: 'alarm',
  },
  {
    id: '2',
    title: '虚拟电厂离线告警',
    content: '苏州聚合商节点通信中断',
    time: '2025-06-09 14:15:42',
    type: 'alarm',
  },
  {
    id: '3',
    title: '售电偏差率超5%阈值',
    content: '客户江苏钢铁集团偏差率异常',
    time: '2025-06-09 13:45:10',
    type: 'alarm',
  },
]);

async function handleMessageClick(msg: WorkbenchMessageItem) {
  if (msg.link) {
    await router.push(msg.link);
    await nextTick();

    const key = getTabKey(router.currentRoute.value);
    const tab = tabbarStore.getTabByKey(key);
    if (tab) {
      await tabbarStore.setTabTitle(tab, `独立储能测算分析-${msg.title}`);
      tabbarStore.setUpdateTime();
    }
  }
}

// ==================== 行业资讯 ====================
const newsData = ref<IndustryNewsItem[]>([]);

const newsCategoryMap: Record<string, { color: string; label: string }> = {
  policy_release: {
    label: $t('workbench.info.news.categories.policy'),
    color: 'blue',
  },
  industry_news: {
    label: $t('workbench.info.news.categories.news'),
    color: 'orange',
  },
  market_report: {
    label: $t('workbench.info.news.categories.report'),
    color: 'green',
  },
  other: {
    label: $t('workbench.info.news.categories.other'),
    color: 'default',
  },
};

function openNews(url: string) {
  window.open(url, '_blank');
}

function getNewsCategoryMeta(category: string) {
  return newsCategoryMap[category] ?? newsCategoryMap.other;
}

async function loadWorkbenchMessages() {
  try {
    systemMessages.value = await getRevenueSchemeShareMessageListApi();
  } catch (error) {
    console.error('加载测算方案分享消息失败:', error);
    systemMessages.value = [];
  }
}

async function loadReleaseNotices() {
  try {
    releaseNotices.value = await getPublishedReleaseNoticeListApi();
  } catch (error) {
    console.error('加载发版通知失败:', error);
    releaseNotices.value = [];
  }
}

async function loadIndustryNews() {
  try {
    newsData.value = await getIndustryNewsListApi();
  } catch (error) {
    console.error('加载行业资讯失败:', error);
    newsData.value = [];
  }
}

onMounted(() => {
  void loadWorkbenchMessages();
  void loadReleaseNotices();
  void loadIndustryNews();
  emitter.on('industry-new-update', loadIndustryNews);
  emitter.on('release-notice-update', loadReleaseNotices);
});
</script>

<template>
  <!-- eslint-disable vue/max-attributes-per-line -->
  <!-- 中间区域：待办、消息、资讯 -->
  <div class="middle-section">
    <!-- 区域C：待办中心 -->
    <Card class="todo-card">
      <template #title>
        <div class="card-title">{{ $t('workbench.info.todo.title') }}</div>
      </template>
      <template #extra>
        <Tabs
          :active-key="activeTodoTab"
          @change="(key) => (activeTodoTab = key)"
          size="small"
          class="header-tabs"
        >
          <TabPane
            key="all"
            :tab="`${$t('workbench.info.todo.tabs.all')}(${approvalTodos.length + workorderTodos.length})`"
          />
          <TabPane
            key="approval"
            :tab="`${$t('workbench.info.todo.tabs.approval')}(${approvalTodos.length})`"
          />
          <TabPane
            key="workorder"
            :tab="`${$t('workbench.info.todo.tabs.workorder')}(${workorderTodos.length})`"
          />
        </Tabs>
      </template>
      <div class="todo-list" v-if="activeTodoTab === 'all'">
        <div
          v-for="item in [...approvalTodos, ...workorderTodos].sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
          )"
          :key="item.id"
          class="todo-item"
        >
          <div class="todo-tag">
            <Tag
              :color="item.status === '审批' ? 'orange' : 'blue'"
              size="small"
            >
              {{ item.status }}
            </Tag>
          </div>
          <div class="todo-content">
            <div class="todo-title">{{ item.title }}</div>
            <div class="todo-meta">
              <span>{{ item.initiator }}</span>
              <span>{{ item.time }}</span>
            </div>
          </div>
        </div>
        <Empty
          v-if="approvalTodos.length === 0 && workorderTodos.length === 0"
          :description="$t('workbench.info.todo.empty.todo')"
        />
      </div>
      <div class="todo-list" v-if="activeTodoTab === 'approval'">
        <div v-for="item in approvalTodos" :key="item.id" class="todo-item">
          <div class="todo-tag">
            <Tag color="orange" size="small">{{ item.status }}</Tag>
          </div>
          <div class="todo-content">
            <div class="todo-title">{{ item.title }}</div>
            <div class="todo-meta">
              <span>{{ item.initiator }}</span>
              <span>{{ item.time }}</span>
            </div>
          </div>
        </div>
        <Empty
          v-if="approvalTodos.length === 0"
          :description="$t('workbench.info.todo.empty.todo')"
        />
      </div>
      <div class="todo-list" v-if="activeTodoTab === 'workorder'">
        <div v-for="item in workorderTodos" :key="item.id" class="todo-item">
          <div class="todo-tag">
            <Tag color="blue" size="small">{{ item.status }}</Tag>
          </div>
          <div class="todo-content">
            <div class="todo-title">{{ item.title }}</div>
            <div class="todo-meta">
              <span>{{ item.initiator }}</span>
              <span>{{ item.time }}</span>
            </div>
          </div>
        </div>
        <Empty
          v-if="workorderTodos.length === 0"
          :description="$t('workbench.info.todo.empty.workorder')"
        />
      </div>
    </Card>

    <!-- 区域D：消息中心 -->
    <Card class="message-card">
      <template #title>
        <div class="card-title">{{ $t('workbench.info.message.title') }}</div>
      </template>
      <template #extra>
        <Tabs
          :active-key="activeMessageTab"
          @change="(key) => (activeMessageTab = key)"
          size="small"
          class="header-tabs"
        >
          <TabPane
            key="all"
            :tab="`${$t('workbench.info.message.tabs.all')}(${systemMessages.length + releaseNotices.length + alarmMessages.length})`"
          />
          <TabPane
            key="system"
            :tab="`${$t('workbench.info.message.tabs.system')}(${systemMessages.length})`"
          />
          <TabPane
            key="release"
            :tab="`${$t('workbench.info.message.tabs.release')}(${releaseNotices.length})`"
          />
          <TabPane
            key="alarm"
            :tab="`${$t('workbench.info.message.tabs.alarm')}(${alarmMessages.length})`"
          />
        </Tabs>
      </template>
      <div class="message-list" v-if="activeMessageTab === 'all'">
        <!-- 系统消息 -->
        <div
          v-for="msg in systemMessages.slice(0, 2)"
          :key="`sys-${msg.id}`"
          class="msg-item"
          @click="handleMessageClick(msg)"
        >
          <div class="msg-tag">
            <Tag color="blue" size="small">
              {{ $t('workbench.info.message.tags.system') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ msg.title }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
        <!-- 发版通知 -->
        <div
          v-for="notice in releaseNotices.slice(0, 2)"
          :key="`rel-${notice.id}`"
          class="msg-item"
          @click="openNoticeDetail(notice)"
        >
          <div class="msg-tag">
            <Tag color="green" size="small">
              {{ $t('workbench.info.message.tags.release') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ notice.title }}</div>
            <div class="msg-time">{{ notice.publishTime }}</div>
          </div>
        </div>
        <!-- 告警消息 -->
        <div
          v-for="msg in alarmMessages.slice(0, 2)"
          :key="`alm-${msg.id}`"
          class="alarm-item msg-item"
        >
          <div class="msg-tag">
            <Tag color="red" size="small">
              {{ $t('workbench.info.message.tags.alarm') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ msg.title }}</div>
            <div class="msg-desc">{{ msg.content }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
        <Empty
          v-if="
            systemMessages.length === 0 &&
            releaseNotices.length === 0 &&
            alarmMessages.length === 0
          "
          :description="$t('workbench.info.message.empty.all')"
        />
      </div>
      <div class="message-list" v-if="activeMessageTab === 'system'">
        <div
          v-for="msg in systemMessages"
          :key="msg.id"
          class="msg-item"
          @click="handleMessageClick(msg)"
        >
          <div class="msg-tag">
            <Tag color="blue" size="small">
              {{ $t('workbench.info.message.tags.system') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ msg.title }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
        <Empty
          v-if="systemMessages.length === 0"
          :description="$t('workbench.info.message.empty.system')"
        />
      </div>
      <div class="message-list" v-if="activeMessageTab === 'release'">
        <div
          v-for="notice in releaseNotices"
          :key="notice.id"
          class="msg-item"
          @click="openNoticeDetail(notice)"
        >
          <div class="msg-tag">
            <Tag color="green" size="small">
              {{ $t('workbench.info.message.tags.release') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ notice.title }}</div>
            <div class="msg-time">{{ notice.publishTime }}</div>
          </div>
        </div>
        <Empty
          v-if="releaseNotices.length === 0"
          :description="$t('workbench.info.message.empty.release')"
        />
      </div>
      <div class="message-list" v-if="activeMessageTab === 'alarm'">
        <div
          v-for="msg in alarmMessages"
          :key="msg.id"
          class="alarm-item msg-item"
        >
          <div class="msg-tag">
            <Tag color="red" size="small">
              {{ $t('workbench.info.message.tags.alarm') }}
            </Tag>
          </div>
          <div class="msg-content">
            <div class="msg-title">{{ msg.title }}</div>
            <div class="msg-desc">{{ msg.content }}</div>
            <div class="msg-time">{{ msg.time }}</div>
          </div>
        </div>
        <Empty
          v-if="alarmMessages.length === 0"
          :description="$t('workbench.info.message.empty.alarm')"
        />
      </div>
    </Card>

    <!-- 区域E：行业资讯 -->
    <Card class="news-card">
      <template #title>
        <div class="card-title">
          <span>{{ $t('workbench.info.news.title') }}</span>
        </div>
      </template>

      <div class="news-list">
        <div
          v-for="news in newsData"
          :key="news.id"
          class="news-item"
          @click="openNews(news.url)"
        >
          <div class="news-tag">
            <Tag :color="getNewsCategoryMeta(news.category).color" size="small">
              {{ getNewsCategoryMeta(news.category).label }}
            </Tag>
          </div>
          <div class="news-content">
            <div class="news-title">{{ news.title }}</div>
            <div class="news-meta">
              <span>{{ news.source }}</span>
              <span>{{ news.publishTime }}</span>
            </div>
          </div>
        </div>
        <Empty
          v-if="newsData.length === 0"
          :description="$t('workbench.info.news.empty')"
        />
      </div>
    </Card>
  </div>
  <!-- 发版通知详情抽屉 -->
  <Drawer
    v-model:open="noticeDrawerVisible"
    :title="$t('workbench.info.releaseDetail.title')"
    width="640px"
    :body-style="{ padding: '16px' }"
    :closable="{ placement: 'end' }"
  >
    <div v-if="currentNotice" class="notice-detail">
      <!-- 头部卡片：标题和发布时间 -->
      <div class="notice-header-card">
        <div class="notice-header-content">
          <h2 class="notice-title">{{ currentNotice.title }}</h2>
          <div class="notice-publish-time">
            <span class="time-label">
              {{ $t('workbench.info.releaseDetail.publishTime') }}
            </span>
            <span class="time-value">{{ currentNotice.publishTime }}</span>
          </div>
        </div>
        <div class="notice-header-icon">
          <img
            src="./svg/version-release.png"
            :alt="$t('workbench.info.releaseDetail.imageAlt')"
            class="version-icon"
          />
        </div>
      </div>

      <!-- 版本说明卡片 -->
      <div class="notice-section-card" v-if="currentNotice.description">
        <div class="section-title">
          <IconifyIcon icon="lucide:info" class="title-icon" />
          <span>{{ $t('workbench.info.releaseDetail.description') }}</span>
        </div>
        <div class="section-desc">{{ currentNotice.description }}</div>
      </div>

      <!-- 版本详情卡片 -->
      <div class="notice-section-card" v-if="currentNotice.content">
        <div class="section-title">
          <IconifyIcon icon="lucide:list" class="title-icon" />
          <span>{{ $t('workbench.info.releaseDetail.detail') }}</span>
        </div>
        <div
          class="content-body section-content"
          v-html="currentNotice.content"
        ></div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
/* 待办卡片 */
.todo-card {
  height: 415px;
}

.todo-card :deep(.ant-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.todo-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0;
}

.todo-card :deep(.ant-card-head-wrapper) {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
}

.todo-card :deep(.ant-card-head-title) {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  font-weight: 500;
  padding: 0;
}

.todo-card :deep(.ant-card-extra) {
  margin-left: auto;
  padding: 0;
  display: flex;
  align-items: center;
}

.todo-card .header-tabs {
  margin: 0;
}

.todo-card :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.todo-card :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.todo-card :deep(.ant-tabs-ink-bar) {
  bottom: 0;
}

.todo-card :deep(.ant-tabs-tab) {
  margin: 0 !important;
  padding: 14px 8px !important;
  font-size: 13px;
}

.todo-card :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 0 !important;
}

.todo-card :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 24px;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 332px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.todo-item:hover {
  background: hsl(var(--accent));
}

.todo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title {
  font-size: 14px;
  color: hsl(var(--foreground));
}

.todo-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.todo-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* 消息卡片 */
.message-card {
  height: 415px;
}

.message-card :deep(.ant-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.message-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0;
}

.message-card :deep(.ant-card-head-wrapper) {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
}

.message-card :deep(.ant-card-head-title) {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  font-weight: 500;
  padding: 0;
}

.message-card :deep(.ant-card-extra) {
  margin-left: auto;
  padding: 0;
  display: flex;
  align-items: center;
}

.message-card .header-tabs {
  margin: 0;
}

.message-card :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.message-card :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.message-card :deep(.ant-tabs-ink-bar) {
  bottom: 0;
}

.message-card :deep(.ant-tabs-tab) {
  margin: 0 !important;
  padding: 14px 8px !important;
  font-size: 13px;
}

.message-card :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 0 !important;
}

.message-card :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 24px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 332px;
  overflow-y: auto;
}

.msg-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.msg-item:hover {
  background: hsl(var(--accent));
}

.msg-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.msg-icon {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: hsl(var(--muted) / 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.msg-title {
  font-size: 14px;
  color: hsl(var(--foreground));
}

.msg-desc {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.msg-time {
  font-size: 12px;
  color: hsl(var(--muted-foreground) / 0.8);
}

.alarm-item {
  background: hsl(var(--destructive) / 0.1);
}

.alarm-item:hover {
  background: hsl(var(--destructive) / 0.15);
}

.icon-blue {
  color: #1890ff;
}

.icon-orange {
  color: #faad14;
}

.icon-red {
  color: #ff4d4f;
}

.msg-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-time {
  font-size: 12px;
  color: #bfbfbf;
}

.alarm-item {
  background: #ff240010;
}

.alarm-item:hover {
  background: #ff240020;
}

/* 资讯卡片 */
.news-card {
  height: 415px;
}

.news-card :deep(.ant-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.news-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0;
}

.news-card :deep(.ant-card-head-wrapper) {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
}

.news-card :deep(.ant-card-head-title) {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  font-weight: 500;
  font-size: 15px;
  color: #1f1f1f;
  padding: 0;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 332px;
  overflow-y: auto;
}

.news-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.news-item:hover {
  background: hsl(var(--accent));
}

.news-title {
  font-size: 14px;
  color: hsl(var(--foreground));
  line-height: 1.5;
}

.news-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.news-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.news-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 通知详情 - 卡片式设计 */
.notice-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 头部卡片 */
.notice-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.notice-header-content {
  flex: 1;
}

.notice-title {
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.notice-publish-time {
  font-size: 14px;
}

.time-label {
  color: hsl(var(--muted-foreground));
}

.time-value {
  color: hsl(var(--foreground));
}

.notice-header-icon {
  margin-left: 16px;
}

.version-icon {
  width: 90px;
  height: auto;
  object-fit: contain;
}

/* 信息卡片 */
.notice-section-card {
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  width: 16px;
  height: 16px;
  color: inherit;
}

.section-desc {
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  line-height: 1.6;
}

.section-content {
  font-size: 14px;
  color: hsl(var(--foreground));
  line-height: 1.6;
}

/* 版本详情内容 */
.content-body {
  font-size: 14px;
  line-height: 1.6;
  color: hsl(var(--foreground));
}

.content-body :deep(p) {
  margin: 0 0 12px 0;
}

.content-body :deep(ul) {
  margin: 0;
  padding-left: 20px;
}

.content-body :deep(li) {
  margin: 8px 0;
  line-height: 1.6;
}

.content-body :deep(h4) {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 16px 0 12px 0;
}
</style>
