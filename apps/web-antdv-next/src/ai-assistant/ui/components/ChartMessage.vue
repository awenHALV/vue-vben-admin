<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { AiChatAssistantChartConfig } from '../../types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useResizeObserver } from '@vueuse/core';

defineOptions({
  name: 'AiAssistantChartMessage',
});

const props = defineProps<{
  chartConfig: AiChatAssistantChartConfig;
  chartData: Record<string, unknown>[];
}>();

const AXIS_LABEL_FONT_PX = 12;

/** 估算类目轴文字占位宽度（中英混排近似，略偏保守） */
function estimateCategoryLabelWidthPx(text: string): number {
  if (!text) return 0;
  let px = 0;
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (cp === undefined) break;
    if (cp > 0xFF_FF) i++;
    const isCjk =
      (cp >= 0x4E_00 && cp <= 0x9F_FF) ||
      (cp >= 0x34_00 && cp <= 0x4D_BF) ||
      (cp >= 0xF9_00 && cp <= 0xFA_FF);
    px += isCjk ? AXIS_LABEL_FONT_PX : AXIS_LABEL_FONT_PX * 0.58;
  }
  return px;
}

const chartWrapRef = ref<HTMLElement | null>(null);
const chartRef = ref<EchartsUIType>();
const chartInnerWidth = ref(0);
const { renderEcharts } = useEcharts(chartRef);
type RenderEchartsOptions = Parameters<typeof renderEcharts>[0];

useResizeObserver(chartWrapRef, (entries) => {
  const w = entries[0]?.contentRect.width;
  chartInnerWidth.value = typeof w === 'number' && w > 0 ? w : 0;
});

const option = computed(() => {
  const { chartConfig, chartData } = props;

  const titleText = chartConfig.title ?? '';
  const xKey = chartConfig.xAxis;
  const yKey = chartConfig.yAxis;

  const toNumberOrNull = (v: unknown) => {
    let n = Number.NaN;
    if (typeof v === 'number') n = v;
    else if (typeof v === 'string') n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  // 饼图：[{ [xAxis]: name, [yAxis]: value }]
  if (chartConfig.type === 'pie') {
    const data = chartData.map((row) => ({
      name: String(row[xKey] ?? ''),
      value: toNumberOrNull(row[yKey]),
    }));

    const opt = {
      legend: {
        top: titleText ? 28 : 0,
      },
      series: [
        {
          type: 'pie',
          radius: ['35%', '70%'],
          center: ['50%', titleText ? '58%' : '50%'],
          data,
        },
      ],
      title: titleText
        ? {
            left: 'center',
            text: titleText,
            textStyle: {
              fontSize: 14,
              fontWeight: 600,
            },
            top: 6,
          }
        : undefined,
      tooltip: {
        trigger: 'item',
      },
    };

    return opt as RenderEchartsOptions;
  }

  const categories = chartData.map((row) => String(row[xKey] ?? ''));
  const categoryCount = Math.max(categories.length, 1);
  const innerW = chartInnerWidth.value;
  const perCategoryPx =
    innerW > 0 ? (innerW - 32) / categoryCount : Number.POSITIVE_INFINITY;
  const maxLabelPx = Math.max(
    ...categories.map((c) => estimateCategoryLabelWidthPx(c)),
    AXIS_LABEL_FONT_PX,
  );
  const useHorizontalLabels = maxLabelPx <= perCategoryPx * 0.92;

  const series = [
    {
      data: chartData.map((row) => toNumberOrNull(row[yKey])),
      name: yKey,
      type: chartConfig.type,
    },
  ];

  const opt = {
    grid: {
      bottom: 0,
      containLabel: true,
      left: '1%',
      right: '1%',
      top: titleText ? 52 : '2%',
    },
    legend: {
      top: titleText ? 28 : 0,
    },
    series,
    title: titleText
      ? {
          left: 'center',
          text: titleText,
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
          },
          top: 6,
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      axisTick: { show: false },
      axisLabel: useHorizontalLabels
        ? {
            fontSize: AXIS_LABEL_FONT_PX,
            interval: 0,
            overflow: 'none' as const,
            rotate: 0,
          }
        : {
            fontSize: AXIS_LABEL_FONT_PX,
            interval: 0,
            overflow: 'truncate' as const,
            rotate: 35,
            width: 90,
          },
      data: categories,
      type: 'category' as const,
    },
    yAxis: [
      {
        axisTick: { show: false },
        splitArea: { show: true },
        type: 'value',
      },
    ],
  };

  return opt as RenderEchartsOptions;
});

function render() {
  renderEcharts(option.value);
}

onMounted(render);
watch(option, render, { deep: true });
</script>

<template>
  <div ref="chartWrapRef" class="w-full">
    <EchartsUI ref="chartRef" class="h-[260px] w-full" />
  </div>
</template>
