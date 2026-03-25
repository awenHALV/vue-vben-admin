# ECharts 示例：单系列水平条形图_条形实时动态排序

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

const updateFrequency = 2000
const dimension = 0
const countryColors: Record<string, string> = {
  Australia: '#00008b',
  Canada: '#f00',
  China: '#ffde00',
  Cuba: '#002a8f',
  Finland: '#003580',
  France: '#ed2939',
  Germany: '#000',
  Iceland: '#003897',
  India: '#f93',
  Japan: '#bc002d',
  'North Korea': '#024fa2',
  'South Korea': '#000',
  'New Zealand': '#00247d',
  Norway: '#ef2b2d',
  Poland: '#dc143c',
  Russia: '#d52b1e',
  Turkey: '#e30a17',
  'United Kingdom': '#00247d',
  'United States': '#b22234'
}

// Generate mock data
function generateMockData() {
  const countries = ['Finland', 'France', 'Germany', 'Iceland', 'Norway', 'Poland', 'Russia', 'United Kingdom']
  const years = [2015, 2016, 2017, 2018, 2019, 2020]
  const data: any[] = []
  
  countries.forEach((country, countryIndex) => {
    years.forEach((year, yearIndex) => {
      const baseValue = 20000 + countryIndex * 8000
      const yearMultiplier = 1 + yearIndex * 0.1
      const randomVariation = (Math.random() - 0.5) * 5000
      const value = Math.round(baseValue * yearMultiplier + randomVariation)
      
      data.push([
        value,
        75 + Math.random() * 10,
        5000000 + Math.random() * 50000000,
        country,
        year
      ])
    })
  })
  return data
}

const mockData = generateMockData()
const years = [2015, 2016, 2017, 2018, 2019, 2020]
const startIndex = 0
const startYear = years[startIndex]

function getFlag(countryName: string) {
  const flagMap: Record<string, string> = {
    'Finland': '🇫🇮',
    'France': '🇫🇷',
    'Germany': '🇩🇪',
    'Iceland': '🇮🇸',
    'Norway': '🇳🇴',
    'Poland': '🇵🇱',
    'Russia': '🇷🇺',
    'United Kingdom': '🇬🇧'
  }
  return flagMap[countryName] || ''
}

const option: EChartsOption = {
  grid: {
    top: 10,
    bottom: 30,
    left: 150,
    right: 80
  },
  xAxis: {
    max: 'dataMax',
    axisLabel: {
      formatter: function (n) {
        return Math.round(n) + ''
      }
    }
  },
  dataset: {
    source: mockData.filter((d) => d[4] === startYear)
  },
  yAxis: {
    type: 'category',
    inverse: true,
    max: 10,
    axisLabel: {
      show: true,
      fontSize: 14,
      formatter: function (value) {
        return value + '{flag|' + getFlag(value) + '}'
      },
      rich: {
        flag: {
          fontSize: 25,
          padding: 5
        }
      }
    },
    animationDuration: 300,
    animationDurationUpdate: 300
  },
  series: [
    {
      realtimeSort: true,
      seriesLayoutBy: 'column',
      type: 'bar',
      itemStyle: {
        color: function (param) {
          return countryColors[param.value[3]] || '#5470c6'
        }
      },
      encode: {
        x: dimension,
        y: 3
      },
      label: {
        show: true,
        precision: 1,
        position: 'right',
        valueAnimation: true,
        fontFamily: 'monospace'
      }
    }
  ],
  animationDuration: 0,
  animationDurationUpdate: updateFrequency,
  animationEasing: 'linear',
  animationEasingUpdate: 'linear',
  graphic: {
    elements: [
      {
        type: 'text',
        right: 160,
        bottom: 60,
        style: {
          text: startYear.toString(),
          font: 'bolder 80px monospace',
          fill: 'rgba(100, 100, 100, 0.25)'
        },
        z: 100
      }
    ]
  }
}

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    chartInstance.setOption(option)
    
    // Start animation sequence
    for (let i = startIndex; i < years.length - 1; ++i) {
      ((i) => {
        setTimeout(() => {
          updateYear(years[i + 1])
        }, (i - startIndex) * updateFrequency)
      })(i)
    }
  }
  
  window.addEventListener('resize', handleResize)
})

function updateYear(year: number) {
  const source = mockData.filter((d) => d[4] === year)
  if (chartInstance && option.series && Array.isArray(option.series)) {
    (option.series[0] as any).data = source
  }
  if (option.graphic && option.graphic.elements) {
    (option.graphic.elements[0] as any).style.text = year.toString()
  }
  chartInstance?.setOption(option)
}

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
