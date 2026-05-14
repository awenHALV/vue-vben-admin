<script lang="ts" setup>
import { nextTick, ref } from 'vue';

import { useTabbarStore } from '@vben/stores';

import { $t } from '#/locales';
import { router } from '#/router';

import SubjectTypeSelectModal from './calendar/SubjectTypeSelectModal.vue';
import TradingCalendar from './calendar/TradingCalendar.vue';

const showSubjectTypeModal = ref(false);
const pendingCalendarTask = ref<any>(null);
const tabbarStore = useTabbarStore();
const tradingCalendarRef = ref<InstanceType<typeof TradingCalendar> | null>(
  null,
);
const longTermTradingPath = '/vpp/market-trading/long-term-trading';
const longTermTradingAddPath = `${longTermTradingPath}/add`;

function handleCalendarSelectTask(task: any) {
  pendingCalendarTask.value = task;
  showSubjectTypeModal.value = true;
}

async function handleSubjectTypeConfirm(subjectType: number) {
  const query: Record<string, string> = {
    pageKey: `long-term-trading-add-${Date.now()}`,
    subjectType: String(subjectType),
  };

  if (pendingCalendarTask.value) {
    query.fromCalendar = 'true';
    query.tradingType = pendingCalendarTask.value.tradeType;
    query.tradingCategory = pendingCalendarTask.value.tradingCycle;
    query.contractStartDate = pendingCalendarTask.value.targetStartDate;
    query.contractEndDate = pendingCalendarTask.value.targetEndDate;
    query.gridAreaId = pendingCalendarTask.value.provinceId;
    pendingCalendarTask.value = null;
  }

  const title = $t('tradingCalendar.newLongTermTrading');
  // if (router.currentRoute.value.path !== longTermTradingPath) {
  //   await router.push(longTermTradingPath);
  //   await nextTick();
  // }

  await router.push({
    path: longTermTradingAddPath,
    query,
  });

  await nextTick();
  const key = getTabKey(router.currentRoute.value);
  const tab = tabbarStore.getTabByKey(key);
  if (tab) {
    await tabbarStore.setTabTitle(tab, title);
    tabbarStore.setUpdateTime();
  }
}

function handleCancel() {
  // 取消日历选中状态
  pendingCalendarTask.value = null;
  tradingCalendarRef.value?.clearSelection();
}
</script>

<template>
  <TradingCalendar
    ref="tradingCalendarRef"
    @select="handleCalendarSelectTask"
    @cancel="handleCancel"
  />
  <SubjectTypeSelectModal
    v-model:visible="showSubjectTypeModal"
    @confirm="handleSubjectTypeConfirm"
  />
</template>
