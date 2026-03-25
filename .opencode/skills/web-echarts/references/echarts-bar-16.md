# ECharts 示例：多系列分组柱状图_底部可拖动缩放 dataZoom

Vue 3 + TypeScript ECharts 组件示例，含 resize 自适应与资源清理。

## 适用场景

- 侧边栏、弹窗或详情面板中展示图表
- 作为 ECharts 图表 option 参考与改造起点
- 图表联动或动态更新场景

## 完整示例代码

```vue
<template>
  <div ref="chartRef" class="chart-container"></div>
</template>

<script setup lang="ts">
/**
 * @author inspur-iep-ai
 */
import { onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// Mock data
const obama_budget_2012 = {
  names: ['Defense', 'Social Security', 'Medicare', 'Education', 'Veterans', 'Transportation', 'Agriculture', 'Energy', 'Justice', 'Science'],
  budget2011List: [700000, 730000, 560000, 70000, 130000, 80000, 25000, 12000, 30000, 31000],
  budget2012List: [720000, 750000, 580000, 68000, 140000, 75000, 23000, 11000, 32000, 33000]
}

const option: EChartsOption = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow',
      label: {
        show: true
      }
    }
  },
  toolbox: {
    show: true,
    feature: {
      dataView: { show: true, readOnly: false },
      magicType: { show: true, type: ['line', 'bar'] },
      restore: { show: true },
      saveAsImage: { show: true }
    }
  },
  legend: {
    data: ['Budget 2011', 'Budget 2012'],
    itemGap: 5
  },
  grid: {
    top: '12%',
    left: '1%',
    right: '10%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      data: obama_budget_2012.names
    }
  ],
  yAxis: [
    {
      type: 'value',
      name: 'Budget (million USD)',
      axisLabel: {
        formatter: function (a) {
          a = +a
          return isFinite(a) ? (a / 1000).toFixed(0) + 'B' : ''
        }
      }
    }
  ],
  dataZoom: [
    {
      show: true,
      start: 0,
      end: 100
    },
    {
      type: 'inside',
      start: 0,
      end: 100
    }
  ],
  series: [
    {
      name: 'Budget 2011',
      type: 'bar',
      data: obama_budget_2012.budget2011List
    },
    {
      name: 'Budget 2012',
      type: 'bar',
      data: obama_budget_2012.budget2012List
    }
  ]
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    chartInstance.setOption(option)
  }
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  chartInstance?.resize()
}
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
}
</style>
```
