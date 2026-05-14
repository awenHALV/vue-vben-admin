<script lang="ts" setup>
/**
 * 工作台首页
 * @author inspur-iep-ai
 */
import { Page } from '@vben/common-ui';

import CustomAppsModule from './components/CustomAppsModule.vue';
import InfoModule from './components/InfoModule.vue';
import TradeCalendarModule from './components/TradeCalendarModule.vue';
import WeatherModule from './components/WeatherModule.vue';
</script>

<template>
  <Page>
    <WeatherModule />
    <CustomAppsModule />
    <InfoModule />
    <TradeCalendarModule />
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

/* 交易日历主体 */
.trade-calendar-body {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  margin: 0 16px 16px 16px;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.weekday-item {
  padding: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(100px, auto);
}

.calendar-cell {
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px;
  min-height: 100px;
  background: #fff;
}

.calendar-cell:nth-child(7n) {
  border-right: none;
}

.calendar-cell.other-month {
  background: #fafafa;
}

.cell-date {
  font-size: 14px;
  color: #262626;
  margin-bottom: 4px;
}

.calendar-cell.other-month .cell-date {
  color: #bfbfbf;
}

.cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-tag.task-trading {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.task-tag.task-not-started {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #1890ff;
}

.task-tag.task-ended {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  color: #bfbfbf;
}

.calendar-cell:hover {
  background-color: #f5f5f5;
}

.date-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 500;
  color: #262626;
  border-radius: 4px;
}

.date-number.today-badge {
  background-color: #1890ff;
  color: #fff;
}

.task-item {
  padding: 4px 6px;
  font-size: 11px;
  line-height: 1.3;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-item.inProgress {
  background-color: rgba(34, 197, 94, 0.12);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.task-item.notStarted {
  background-color: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.task-item.ended {
  background-color: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
}

.task-item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.task-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.task-item.disabled:hover {
  transform: none;
  box-shadow: none;
}

.more-tasks {
  padding: 2px 6px;
  font-size: 10px;
  color: #8c8c8c;
  text-align: center;
  cursor: pointer;
}

.more-tasks:hover {
  color: #1890ff;
}

.collapse-tasks {
  padding: 2px 6px;
  font-size: 10px;
  color: #1890ff;
  text-align: center;
  cursor: pointer;
}

.collapse-tasks:hover {
  opacity: 0.8;
}

.cell-tasks.expanded {
  max-height: 300px;
  overflow-y: auto;
}

.cell-tasks.expanded::-webkit-scrollbar {
  width: 4px;
}

.cell-tasks.expanded::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

/* 日历底部 */
.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  margin: 0 16px 16px 16px;
}

.footer-tip {
  font-size: 14px;
  color: #595959;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* 通知详情 - 全新设计 */
.notice-detail {
  background: #fafafa;
  min-height: 100%;
}

/* 头部区域 */
.notice-header {
  background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
  padding: 32px 24px;
  color: white;
}

.version-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
  margin-bottom: 12px;
}

.tag-icon {
  font-size: 12px;
}

.notice-title {
  font-size: 22px;
  font-weight: 600;
  color: white;
  margin: 0;
  line-height: 1.4;
}

/* 元信息区域 */
.notice-meta-section {
  display: flex;
  gap: 32px;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-icon {
  font-size: 16px;
  color: #bfbfbf;
}

.meta-label {
  font-size: 13px;
  color: #8c8c8c;
}

.meta-value {
  font-size: 13px;
  color: #262626;
  font-weight: 500;
}

/* 摘要卡片 */
.notice-summary-card {
  margin: 20px 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border-left: 4px solid #faad14;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #faad14;
  font-size: 14px;
  font-weight: 500;
}

.summary-icon {
  font-size: 18px;
}

.summary-content {
  font-size: 14px;
  color: #595959;
  line-height: 1.6;
}

/* 详细内容区域 */
.notice-content-section {
  margin: 0 24px 24px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.content-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.content-icon {
  font-size: 20px;
  color: #1890ff;
}

.content-body {
  font-size: 14px;
  line-height: 1.8;
  color: #434343;
}

.content-body :deep(p) {
  margin: 0 0 16px 0;
}

.content-body :deep(ul) {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.content-body :deep(li) {
  position: relative;
  padding-left: 20px;
  margin: 12px 0;
  line-height: 1.6;
}

.content-body :deep(li::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1890ff;
}

.content-body :deep(li strong) {
  color: #262626;
  font-weight: 600;
}
</style>
