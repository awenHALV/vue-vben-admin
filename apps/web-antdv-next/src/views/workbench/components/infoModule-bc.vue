<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { getTabKey, useTabbarStore } from '@vben/stores';

import { Card, Drawer, Empty, TabPane, Tabs, Tag } from 'antdv-next';

import { $t } from '#/locales';

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
  id: string;
  title: string;
  content?: string;
  time: string;
  type: string;
  link?: string;
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
const systemMessages = ref<MessageItem[]>([
  {
    id: '1',
    title: '储能项目收益测算方案已完成，请查看',
    content: '',
    time: '2025-06-09 14:35:28',
    type: 'system',
    link: '/vpp/analysis-revenue/energy-storage-project/plan?projectId=2044264130276392961',
  },
  {
    id: '2',
    title: 'VPP调度优化方案已完成，请查看',
    content: '',
    time: '2025-06-09 14:15:42',
    type: 'system',
    link: '/strategy-workbench',
  },
  {
    id: '3',
    title: '现货交易策略回测方案已完成，请查看',
    content: '',
    time: '2025-06-09 13:45:10',
    type: 'system',
    link: '/trading-replay',
  },
  {
    id: '4',
    title: '中长期交易结算方案已完成，请查看',
    content: '',
    time: '2025-06-09 12:30:05',
    type: 'system',
    link: '/settlement/vpp',
  },
  {
    id: '5',
    title: '需求响应能力评估方案已完成，请查看',
    content: '',
    time: '2025-06-09 11:25:33',
    type: 'system',
    link: '/demand-response',
  },
]);

// 发版通知 - 后台配置
interface ReleaseNotice {
  id: string;
  title: string;
  description: string;
  content: string;
  publishTime: string;
  status: 'draft' | 'published';
}

const releaseNotices = ref<ReleaseNotice[]>([
  {
    id: '1',
    title: 'V2.1.0 现货交易辅助模块上线',
    description:
      '本次更新聚焦现货交易场景，新增辅助决策功能和算法优化，提升交易效率和准确性。',
    content: `<h4>功能更新</h4>
      <ul>
        <li><strong>现货交易辅助决策：</strong>基于历史数据和实时行情，智能推荐交易策略，支持多维度风险评估</li>
        <li><strong>电价预测算法优化：</strong>采用深度学习模型，预测准确度从90%提升至95%，预测周期延长至72小时</li>
        <li><strong>结算报表导出增强：</strong>支持Excel、PDF、CSV多格式导出，新增自定义字段配置和数据透视功能</li>
      </ul>
      <h4>性能优化</h4>
      <ul>
        <li>页面加载速度提升40%，首屏渲染时间降至1.2秒以内</li>
        <li>大数据量场景下表格渲染性能优化，支持百万级数据流畅展示</li>
        <li>内存占用降低25%，长时间运行更稳定</li>
      </ul>
      <p><strong>温馨提示：</strong>本次更新涉及核心交易模块，建议在交易低峰期进行系统升级。升级过程中如有任何问题，请联系技术支持团队：400-888-8888</p>`,
    publishTime: '2025-06-09 10:00:00',
    status: 'published',
  },
  {
    id: '2',
    title: 'V2.0.5 热修复版本发布',
    description: '紧急修复结算报表导出异常问题，优化系统稳定性。',
    content: `<h4>修复内容</h4>
      <ul>
        <li><strong>报表导出：</strong>修复大数据量导出时的内存溢出问题</li>
        <li><strong>数据同步：</strong>优化同步机制，降低延迟至1秒以内</li>
        <li><strong>权限控制：</strong>修复部分用户无法查看结算明细的问题</li>
      </ul>
      <p><strong>版本状态：</strong>已稳定运行72小时，无新增问题反馈</p>`,
    publishTime: '2025-06-08 16:30:00',
    status: 'published',
  },
  {
    id: '3',
    title: 'V2.0.0 大版本更新',
    description: '全新工作台功能上线，重构用户界面，提升操作体验。',
    content: `<h4>主要更新</h4>
      <ul>
        <li><strong>工作台首页：</strong>个性化仪表盘设计，集中展示天气、待办、消息、资讯、日历等关键信息</li>
        <li><strong>自定义应用：</strong>支持创建快捷应用入口，最多可添加8个常用功能</li>
        <li><strong>消息中心：</strong>统一消息管理入口，系统通知、发版公告、告警提醒分类展示</li>
        <li><strong>交易日历：</strong>可视化展示交易任务和时间节点</li>
      </ul>
      <p><strong>版本状态：</strong>已稳定运行30天，用户反馈良好</p>`,
    publishTime: '2025-06-01 09:00:00',
    status: 'published',
  },
]);

const noticeDrawerVisible = ref(false);
const currentNotice = ref<null | ReleaseNotice>(null);

function openNoticeDetail(notice: ReleaseNotice) {
  currentNotice.value = notice;
  noticeDrawerVisible.value = true;
}

// 告警消息 - Mock数据
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

async function handleMessageClick(msg: MessageItem) {
  if (msg.link) {
    await router.push(msg.link);
    await nextTick();

    const key = getTabKey(router.currentRoute.value);
    const tab = tabbarStore.getTabByKey(key);
    if (tab) {
      await tabbarStore.setTabTitle(tab, `独立投资储能测算-${msg.title}`);
      tabbarStore.setUpdateTime();
    }
  }
}

// ==================== 行业资讯 ====================
interface NewsItem {
  id: string;
  title: string;
  category: 'news' | 'other' | 'policy' | 'report';
  source: string;
  publishTime: string;
  url: string;
}

const newsData = ref<NewsItem[]>([
  {
    id: '1',
    title: '2026年新能源上网电价调整方案发布',
    category: 'policy',
    source: '省发改委',
    publishTime: '2025-06-01',
    url: 'https://www.example.com/news/1',
  },
  {
    id: '2',
    title: '三季度碳交易配额分配方案已公示',
    category: 'news',
    source: '交易中心',
    publishTime: '2025-05-28',
    url: 'https://www.example.com/news/2',
  },
  {
    id: '3',
    title: '国家能源局发布新型储能项目管理规范',
    category: 'policy',
    source: '国家能源局',
    publishTime: '2025-05-25',
    url: 'https://www.example.com/news/3',
  },
  {
    id: '4',
    title: '2026年Q2电力市场交易分析报告',
    category: 'report',
    source: '研究院',
    publishTime: '2025-05-20',
    url: 'https://www.example.com/news/4',
  },
  {
    id: '5',
    title: '电力市场运行基本规则修订征求意见稿',
    category: 'policy',
    source: '国家能源局',
    publishTime: '2025-05-15',
    url: 'https://www.example.com/news/5',
  },
  {
    id: '6',
    title: '储能行业2026年发展预测报告',
    category: 'report',
    source: '行业协会',
    publishTime: '2025-05-10',
    url: 'https://www.example.com/news/6',
  },
  {
    id: '7',
    title: '虚拟电厂参与调频辅助服务市场新政解读',
    category: 'news',
    source: '电力报',
    publishTime: '2025-05-08',
    url: 'https://www.example.com/news/7',
  },
  {
    id: '8',
    title: '平台系统维护公告：6月15日凌晨升级',
    category: 'other',
    source: '系统管理员',
    publishTime: '2025-06-08',
    url: 'https://www.example.com/news/8',
  },
]);

const newsCategoryMap: Record<string, { color: string; label: string }> = {
  policy: { label: $t('workbench.info.news.categories.policy'), color: 'blue' },
  news: { label: $t('workbench.info.news.categories.news'), color: 'orange' },
  report: {
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
</script>

<template>
  <!-- eslint-disable vue/max-attributes-per-line -->
  <!-- 中间区域：待办、消息、资讯 -->
  <div class="middle-section">
    <!-- 区域C：待办中心 -->
    <Card class="todo-card" :bordered="false">
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
    <Card class="message-card" :bordered="false">
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
    <Card class="news-card" :bordered="false">
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
            <Tag :color="newsCategoryMap[news.category].color" size="small">
              {{ newsCategoryMap[news.category].label }}
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
    closable
    :body-style="{ padding: '16px' }"
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
            src="./version-release.png"
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
  background: #fff2f0;
}

.alarm-item:hover {
  background: #ffe6e6;
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
  background: rgba(22, 119, 255, 0.1);
  border: 1px solid rgba(22, 119, 255, 0.2);
  border-radius: 8px;
}

.notice-header-content {
  flex: 1;
}

.notice-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.notice-publish-time {
  font-size: 14px;
}

.time-label {
  color: #8c8c8c;
}

.time-value {
  color: #262626;
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
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
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
  color: #595959;
  line-height: 1.6;
}

.section-content {
  font-size: 14px;
  color: #434343;
  line-height: 1.6;
}

/* 版本详情内容 */
.content-body {
  font-size: 14px;
  line-height: 1.6;
  color: #434343;
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
  color: #262626;
  margin: 16px 0 12px 0;
}
</style>
