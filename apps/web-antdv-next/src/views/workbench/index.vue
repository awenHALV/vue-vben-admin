<script lang="ts" setup>
/**
 * 工作台首页
 * @author inspur-iep-ai
 */
import { Page } from '@vben/common-ui';

import { usePageButtonAccess } from '#/composables/use-page-button-access';

import { WORKBENCH_PAGE_BUTTON_CODES } from './button-permissions';
import CustomAppsModule from './components/CustomAppsModule.vue';
import InfoModule from './components/InfoModule.vue';
import TradeCalendarModule from './components/TradeCalendarModule.vue';
import WeatherModule from './components/WeatherModule.vue';

const { canButton } = usePageButtonAccess();
</script>

<template>
  <Page>
    <WeatherModule />
    <CustomAppsModule />
    <InfoModule />
    <TradeCalendarModule
      v-if="canButton(WORKBENCH_PAGE_BUTTON_CODES.calendar)"
    />
  </Page>
</template>

<style>
/* 中间区域 */
.middle-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 1200px) {
  .middle-section {
    grid-template-columns: 1fr;
  }
}

/* 日历卡片 */
.calendar-card :deep(.ant-card-body) {
  padding: 0;
}

.calendar-card :deep(.ant-card-head) {
  border-bottom: none;
  padding: 0;
}

.calendar-card :deep(.ant-card-head-title) {
  padding: 16px;
}

.trade-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  flex-wrap: nowrap;
  gap: 16px;
}

/* 交易日历头部 */
.trade-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: nowrap;
  gap: 16px;
}

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.calendar-month {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  min-width: 90px;
  text-align: center;
}

.calendar-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.filter-label {
  font-size: 13px;
  color: #595959;
  white-space: nowrap;
}

.calendar-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

.calendar-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #595959;
  white-space: nowrap;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.trading {
  background: #52c41a;
}

.legend-dot.not-started {
  background: #1890ff;
}

.legend-dot.ended {
  background: #bfbfbf;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
}
</style>
