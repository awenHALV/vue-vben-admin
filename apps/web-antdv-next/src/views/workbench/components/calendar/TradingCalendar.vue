<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { TradingCalendarTask } from './types';

import type {
  GridAreaItem,
  TradingCalendarTaskItem,
} from '#/api/trading-calendar';

import { computed, onMounted, ref, watch } from 'vue';

import { VbenButton } from '@vben/common-ui';
import { i18n } from '@vben/locales';

/**
 * 交易日历
 * @author inspur-iep-ai
 * @description 参考交易日历页面，支持电网区域切换和日历联动、日历交易收缩隐藏和时间校验
 */
import { Card, message, Select, Tooltip } from 'antdv-next';
import dayjs from 'dayjs';

import { DictCodes, useDict } from '#/api/dict';
import {
  getGridAreaListApi,
  getTradingCalendarListApi,
} from '#/api/trading-calendar';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { $t } from '#/locales';

import { WORKBENCH_PAGE_BUTTON_CODES } from '../../button-permissions';
import { getTradingStatusLabels } from './types';
import { getTradingStatus } from './utils';

defineOptions({ name: 'TradingCalendarModal' });

const emit = defineEmits<{
  cancel: [];
  select: [task: TradingCalendarTask];
}>();
const { canButton } = usePageButtonAccess();
interface CalendarDayCell {
  date: Dayjs;
  hiddenCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  key: string;
  tasks: TradingCalendarTask[];
  visibleTasks: TradingCalendarTask[];
}

const MAX_VISIBLE_TASKS = 4;

// 获取当前语言
const currentLocale = computed(() => i18n.global.locale.value);

// 交易类型字典
const { options: tradeTypeRawOptions } = useDict(DictCodes.TRANS_LTS_TYPE);

// 国际化后的交易类型选项
const tradeTypeOptions = computed(() =>
  tradeTypeRawOptions.value.map((item) => ({
    label:
      currentLocale.value === 'en-US' ? item.labelEn || item.label : item.label,
    value: item.value,
  })),
);

// 状态变量
const currentMonth = ref(dayjs());
const loading = ref(false);
const tasks = ref<TradingCalendarTask[]>([]);
const gridAreas = ref<GridAreaItem[]>([]);
const selectedProvinceCode = ref<string>('');
const expandedCellKey = ref<null | string>(null);
const selectedTask = ref<null | TradingCalendarTask>(null);

// 星期标签
const weekdayLabels = computed(() => [
  $t('tradingCalendar.weekdays.mon'),
  $t('tradingCalendar.weekdays.tue'),
  $t('tradingCalendar.weekdays.wed'),
  $t('tradingCalendar.weekdays.thu'),
  $t('tradingCalendar.weekdays.fri'),
  $t('tradingCalendar.weekdays.sat'),
  $t('tradingCalendar.weekdays.sun'),
]);

// 电网区域选项
const provinceOptions = computed(() =>
  gridAreas.value.map((area) => ({
    label: area.gridAreaName,
    value: area.gridAreaCode,
  })),
);

// 按日期分组的任务
const tasksByDate = computed(() => {
  const result = new Map<string, TradingCalendarTask[]>();
  tasks.value.forEach((task) => {
    const taskList = result.get(task.tradeDate) ?? [];
    taskList.push(task);
    result.set(task.tradeDate, taskList);
  });
  return result;
});

// 日历单元格数据
const monthCells = computed<CalendarDayCell[]>(() => {
  const monthStart = currentMonth.value.startOf('month');
  const gridStart = getStartOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = gridStart.add(index, 'day');
    const key = date.format('YYYY-MM-DD');
    const dayTasks = tasksByDate.value.get(key) ?? [];

    return {
      date,
      hiddenCount: Math.max(dayTasks.length - MAX_VISIBLE_TASKS, 0),
      isCurrentMonth: date.isSame(monthStart, 'month'),
      isToday: date.isSame(dayjs(), 'day'),
      key,
      tasks: dayTasks,
      visibleTasks: dayTasks.slice(0, MAX_VISIBLE_TASKS),
    };
  });
});

// 当前月份标签
const currentMonthLabel = computed(() =>
  $t('tradingCalendar.page.monthFormat', {
    year: currentMonth.value.year(),
    month: currentMonth.value.month() + 1,
  }),
);

// 获取周开始日期
function getStartOfWeek(date: Dayjs): Dayjs {
  const weekday = date.day();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return date.add(offset, 'day').startOf('day');
}

// 格式化任务显示
function formatTaskDisplay(task: TradingCalendarTask): string {
  const startDate = dayjs(task.targetStartDate);
  const endDate = dayjs(task.targetEndDate);

  let dateStr: string;
  if (startDate.isSame(endDate, 'day')) {
    dateStr =
      currentLocale.value === 'en-US'
        ? startDate.format('MMM D')
        : `${startDate.month() + 1}月${startDate.date()}日`;
  } else if (startDate.month() === endDate.month()) {
    dateStr =
      currentLocale.value === 'en-US'
        ? `${startDate.format('MMM D')}-${endDate.date()}`
        : `${startDate.month() + 1}月${startDate.date()}-${endDate.date()}日`;
  } else {
    dateStr =
      currentLocale.value === 'en-US'
        ? `${startDate.format('MMM D')} - ${endDate.format('MMM D')}`
        : `${startDate.month() + 1}月${startDate.date()}日-${endDate.month() + 1}月${endDate.date()}日`;
  }

  const typeLabel =
    tradeTypeOptions.value.find((o) => o.value === task.tradeType)?.label ||
    task.tradeType;
  return `${dateStr}${typeLabel}(${task.targetStartTime}-${task.targetEndTime})`;
}

// 转换API任务到日历任务
function convertApiTaskToCalendarTask(
  item: TradingCalendarTaskItem,
): TradingCalendarTask {
  const province = gridAreas.value.find(
    (area) => area.gridAreaCode === item.province,
  );
  const [targetStartTime = '', targetEndTime = ''] = (
    item.tradeTime || ''
  ).split('-');

  return {
    id: String(item.id),
    provinceId: province?.id ?? item.province, // 使用电网区域ID而非编码
    provinceName: province?.gridAreaName || item.province,
    tradeDate: item.tradeDate,
    tradeType: item.tradeType,
    tradingCycle: item.tradeCycle,
    targetStartDate: item.targetStartTime,
    targetEndDate: item.targetEndTime,
    targetStartTime,
    targetEndTime,
    creatorName: '',
    createTime: '',
  };
}

// 加载电网区域
async function loadGridAreas() {
  try {
    gridAreas.value = await getGridAreaListApi();
    const firstArea = gridAreas.value[0];
    if (firstArea) {
      selectedProvinceCode.value = firstArea.gridAreaCode;
    }
  } catch (error) {
    console.error('加载电网区域失败:', error);
  }
}

// 加载任务列表
async function loadTasks() {
  if (!selectedProvinceCode.value) return;
  loading.value = true;
  try {
    const monthStr = currentMonth.value.format('YYYY-MM');
    const result = await getTradingCalendarListApi({
      province: selectedProvinceCode.value,
      month: monthStr,
      size: -1,
    });
    const records = result.records || result.list || [];
    tasks.value = records.map((record) => convertApiTaskToCalendarTask(record));
  } catch (error) {
    console.error('加载交易日历失败:', error);
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

// 电网区域切换
function handleProvinceChange() {
  loadTasks();
}

// 电网区域搜索过滤
function filterProvinceOption(input: string, option: any) {
  const label = option.label?.toString() || '';
  return label.toLowerCase().includes(input.toLowerCase());
}

// 月份导航
function navigateMonth(step: number) {
  currentMonth.value = currentMonth.value.add(step, 'month');
  loadTasks();
}

// 选择任务（仅记录选中状态）
function handleSelectTask(task: TradingCalendarTask) {
  const status = getTradingStatus(task);
  if (status === 'ended') {
    return;
  }
  selectedTask.value = task;
}

// 应用至当前申报
function handleApply() {
  if (!selectedTask.value) {
    message.warning($t('tradingCalendar.messages.selectTaskFirst'));
    return;
  }
  emit('select', selectedTask.value);
}

function clearSelection() {
  selectedTask.value = null;
}

// 取消
function handleCancel() {
  clearSelection();
  emit('cancel');
}

// 展开/收缩任务列表
function toggleExpandTasks(cellKey: string) {
  expandedCellKey.value = expandedCellKey.value === cellKey ? null : cellKey;
}

// 监听月份变化
watch(currentMonth, loadTasks);

// 初始化
onMounted(async () => {
  await loadGridAreas();
  await loadTasks();
});

defineExpose({ clearSelection });
</script>

<template>
  <Card class="trading-calendar-wrap">
    <div class="trading-calendar">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="date-picker-wrapper">
            <VbenButton
              variant="outline"
              size="sm"
              class="cursor-pointer"
              @click="navigateMonth(-1)"
            >
              ◀
            </VbenButton>
            <span class="current-date">{{ currentMonthLabel }}</span>
            <VbenButton
              variant="outline"
              size="sm"
              class="cursor-pointer"
              @click="navigateMonth(1)"
            >
              ▶
            </VbenButton>
          </div>
          <div class="province-select-wrapper">
            <span class="province-label">
              {{ $t('tradingCalendar.labels.province') }}:
            </span>
            <Select
              v-model:value="selectedProvinceCode"
              :options="provinceOptions"
              style="width: 120px"
              show-search
              :filter-option="filterProvinceOption"
              @change="handleProvinceChange"
            />
          </div>
        </div>
        <div class="toolbar-center">
          <h2 class="calendar-title">
            {{ $t('tradingCalendar.page.calendarTitle') }}
          </h2>
        </div>
        <div class="toolbar-right">
          <div class="legend">
            <div class="legend-item">
              <span class="legend-dot legend-inProgress"></span>
              <span>{{ getTradingStatusLabels().inProgress }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-notStarted"></span>
              <span>{{ getTradingStatusLabels().notStarted }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot legend-ended"></span>
              <span>{{ getTradingStatusLabels().ended }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 日历主体 -->
      <div class="calendar-wrapper">
        <div v-if="loading" class="loading-state">
          <template v-for="i in 7" :key="i">
            <div class="loading-cell"></div>
          </template>
        </div>

        <template v-else>
          <div class="calendar-grid">
            <!-- 星期标题行 -->
            <div
              v-for="weekday in weekdayLabels"
              :key="weekday"
              class="weekday-cell"
            >
              {{ weekday }}
            </div>

            <!-- 日期单元格 -->
            <div
              v-for="cell in monthCells"
              :key="cell.key"
              class="calendar-cell"
              :class="{
                'other-month': !cell.isCurrentMonth,
                today: cell.isToday,
              }"
            >
              <!-- 日期数字 -->
              <div class="cell-date">
                <span
                  class="date-number"
                  :class="{ 'today-badge': cell.isToday }"
                >
                  {{ cell.date.date() }}
                </span>
              </div>

              <!-- 任务列表 -->
              <div
                class="cell-tasks"
                :class="{ expanded: expandedCellKey === cell.key }"
              >
                <Tooltip
                  v-for="task in expandedCellKey === cell.key
                    ? cell.tasks
                    : cell.visibleTasks"
                  :key="task.id"
                  :title="formatTaskDisplay(task)"
                  placement="top"
                >
                  <div
                    class="task-item"
                    :class="[
                      getTradingStatus(task),
                      { disabled: getTradingStatus(task) === 'ended' },
                      { selected: selectedTask?.id === task.id },
                    ]"
                    @click="handleSelectTask(task)"
                  >
                    {{ formatTaskDisplay(task) }}
                  </div>
                </Tooltip>

                <div
                  v-if="cell.hiddenCount > 0 && expandedCellKey !== cell.key"
                  class="more-tasks"
                  @click="toggleExpandTasks(cell.key)"
                >
                  +{{ cell.hiddenCount }}
                  {{ $t('tradingCalendar.labels.items') }}
                </div>

                <div
                  v-if="
                    expandedCellKey === cell.key &&
                    cell.tasks.length > MAX_VISIBLE_TASKS
                  "
                  class="collapse-tasks"
                  @click="toggleExpandTasks(cell.key)"
                >
                  {{ $t('tradingCalendar.actions.collapse') }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <span class="hint-text">{{
          $t('tradingCalendar.modal.clickTaskToSelect')
        }}</span>
        <div class="footer-buttons">
          <VbenButton
            v-if="canButton(WORKBENCH_PAGE_BUTTON_CODES.cancel)"
            variant="outline"
            class="cursor-pointer"
            @click="handleCancel"
          >
            {{ $t('tradingCalendar.common.cancelSelect') }}
          </VbenButton>
          <VbenButton
            v-if="canButton(WORKBENCH_PAGE_BUTTON_CODES.apply)"
            :disabled="!selectedTask"
            class="cursor-pointer"
            @click="handleApply"
          >
            {{ $t('tradingCalendar.common.applyToDeclaration') }}
          </VbenButton>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.trading-calendar {
  background: hsl(var(--background));
  height: 700px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: hsl(var(--card));
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  position: relative;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.province-select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid hsl(var(--border));
}

.province-label {
  font-size: 14px;
  color: hsl(var(--foreground));
  font-weight: 500;
}

.current-date {
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  min-width: 100px;
  text-align: center;
}

.toolbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.calendar-title {
  font-size: 16px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin: 0;
  text-align: center;
  width: 100%;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-inProgress {
  background-color: #2563eb;
}
.legend-notStarted {
  background-color: #16a34a;
}
.legend-ended {
  background-color: #9ca3af;
}

.calendar-wrapper {
  background: hsl(var(--card));
  border-radius: 8px;
  border: 1px solid hsl(var(--border));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  width: 100%;
  flex: 1;
  overflow-y: auto;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
}

.weekday-cell {
  padding: 12px 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
  border-right: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
}

.calendar-grid > .weekday-cell:last-child {
  border-right: none;
}

.calendar-cell {
  border-right: 1px solid hsl(var(--border));
  border-bottom: 1px solid hsl(var(--border));
  padding: 6px;
  min-height: 80px;
  transition: background-color 0.2s;
}

.calendar-grid > :nth-child(7n) {
  border-right: none;
}

.calendar-cell:hover {
  background-color: hsl(var(--accent));
}

.calendar-cell.other-month {
  background-color: hsl(var(--muted) / 0.5);
}

.calendar-cell.other-month .date-number {
  color: hsl(var(--muted-foreground));
}

.cell-date {
  margin-bottom: 4px;
}

.date-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--foreground));
  border-radius: 4px;
}

.date-number.today-badge {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.task-item.notStarted {
  background-color: rgba(34, 197, 94, 0.12);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.task-item.inProgress {
  background-color: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.task-item.ended {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border: 1px solid hsl(var(--border));
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

.task-item.selected {
  box-shadow: 0 0 0 2px hsl(var(--primary));
}

.task-item.selected:hover {
  box-shadow:
    0 0 0 2px hsl(var(--primary)),
    0 2px 4px rgba(0, 0, 0, 0.1);
}

.more-tasks {
  padding: 2px 6px;
  font-size: 10px;
  color: hsl(var(--muted-foreground));
  text-align: center;
  cursor: pointer;
}

.more-tasks:hover {
  color: hsl(var(--primary));
}

.collapse-tasks {
  padding: 2px 6px;
  font-size: 10px;
  color: hsl(var(--primary));
  text-align: center;
  cursor: pointer;
  transition: opacity 0.2s;
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
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 2px;
}

.cell-tasks.expanded::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

.loading-state {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  padding: 16px;
}

.loading-cell {
  height: 80px;
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--border)) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid hsl(var(--border));
}

.footer-buttons {
  display: flex;
  gap: 8px;
}

.hint-text {
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}
</style>
