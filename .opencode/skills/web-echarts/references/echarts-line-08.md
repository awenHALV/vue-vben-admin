# ECharts 示例：多条分组折线图_初始渲染动画逐步绘制折线

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

// Generate local data
function generateLocalData() {
  const countries = ['Finland', 'France', 'Germany', 'Iceland', 'Norway', 'Poland', 'Russia', 'United Kingdom']
  const years: number[] = []
  for (let year = 1950; year <= 2020; year += 5) {
    years.push(year)
  }
  
  const data: any[] = []
  countries.forEach((country, countryIndex) => {
    years.forEach((year, yearIndex) => {
      const baseIncome = 20000 + countryIndex * 5000
      const yearProgress = yearIndex / years.length
      const income = baseIncome + yearProgress * 30000 + Math.random() * 5000
      
      const baseLifeExp = 70 + countryIndex * 2
      const lifeExp = baseLifeExp + yearProgress * 10 + Math.random() * 3
      
      const basePop = 5000000 + countryIndex * 10000000
      const population = basePop + yearProgress * basePop * 0.5 + Math.random() * 1000000
      
      data.push([
        Math.round(income),
        Math.round(lifeExp * 10) / 10,
        Math.round(population),
        country,
        year
      ])
    })
  })
  return data
}

const rawData = generateLocalData()
const countries = ['Finland', 'France', 'Germany', 'Iceland', 'Norway', 'Poland', 'Russia', 'United Kingdom']
const seriesList: any[] = []

countries.forEach((country) => {
  const countryData = rawData.filter((item) => item[3] === country).sort((a, b) => a[4] - b[4])
  const chartData = countryData.map((item) => [item[4], item[0]])
  
  seriesList.push({
    type: 'line',
    name: country,
    showSymbol: false,
    data: chartData,
    endLabel: {
      show: true,
      formatter: function (params: any) {
        return country + ': ' + Math.round(params.value[1])
      }
    },
    labelLayout: {
      moveOverlap: 'shiftY'
    },
    emphasis: {
      focus: 'series'
    }
  })
})

const option: EChartsOption = {
  animationDuration: 10000,
  title: {
    text: 'Income of European Countries since 1950'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross'
    }
  },
  legend: {
    data: countries,
    top: 30
  },
  xAxis: {
    type: 'value',
    name: 'Year',
    nameLocation: 'middle',
    nameGap: 30,
    min: 1950,
    max: 2020,
    interval: 10
  },
  yAxis: {
    type: 'value',
    name: 'Income (USD)',
    nameLocation: 'middle',
    nameGap: 50
  },
  grid: {
    left: 80,
    right: 140,
    top: 80,
    bottom: 80
  },
  series: seriesList
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
