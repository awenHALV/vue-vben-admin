---
name: web-charts
description: ECharts 图表代码参考技能（纯图表）。用于生成或改写 ECharts option 与 Vue 3 图表组件代码，适用于折线图、柱状图、饼图、散点图、雷达图、仪表盘等图表配置参考。当任务需要 ECharts 图表样式、series 配置、坐标轴、tooltip、legend、dataZoom 等图表本体能力时触发。所有生成的代码必须添加作者注释 `@author inspur-iep-ai`。
license: Apache-2.0
---

# ECharts 图表代码参考技能（纯图表）

本 Skill 提供 ECharts 图表代码生成能力，所有示例均采用 Vue 3 + TypeScript 编写。

## 核心要求

- **所有生成的代码必须添加作者注释**：`@author inspur-iep-ai`
- **代码示例使用 Vue 3 Composition API**：采用 `<script setup lang="ts">` 语法
- **纯图表能力**：不涉及地图 API 集成
- **优先使用项目封装的 `@vben/plugins/echarts`**：使用 `EchartsUI` 组件 + `useEcharts` Hook

## 适用场景

- 需要生成/改写 ECharts `option`
- 需要找某类图表的完整 Vue 示例（折线/柱状/饼图/散点/雷达/仪表盘）
- 需要在侧边栏、弹窗或详情面板中展示图表
- 需要图表联动或动态更新场景

## 使用方式（建议）

1. 优先使用项目封装的 `@vben/plugins/echarts` 模块
2. 先读取 `references/echarts-index.md` 选择最接近的图表类型
3. 再按需读取 1~2 个 `references/echarts-*.md`
4. 优先复用示例中的 `option` 结构，不要无依据重写复杂配置
5. 所有代码必须包含 `@author inspur-iep-ai` 注释

## 代码规范

### 作者注释要求

所有生成的 Vue 组件文件必须在 `<script>` 标签顶部添加作者注释：

```ts
/**
 * @author inspur-iep-ai
 */
```

### Vue 组件结构（项目标准写法）

```vue
<script lang="ts" setup>
/**
 * @author inspur-iep-ai
 */
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    // ECharts option 配置
    grid: {
      bottom: 0,
      containLabel: true,
      left: '1%',
      right: '1%',
      top: '2%',
    },
    series: [],
    tooltip: {},
    xAxis: {},
    yAxis: {},
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>
```

### 传统写法（仅在不使用项目封装时使用）

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
```

## 参考文档

- `references/echarts-index.md` — 图表类型索引（入口）
- `references/echarts-line-*.md` — 折线图
- `references/echarts-bar-*.md` — 柱状图/条形图
- `references/echarts-pie-*.md` — 饼图
- `references/echarts-scatter-*.md` — 散点图/气泡图
- `references/echarts-radar-*.md` — 雷达图
- `references/echarts-gauge-*.md` — 仪表盘

## 注意事项

1. **优先使用项目封装**：使用 `EchartsUI` 组件 + `useEcharts` Hook，自动处理 resize 和 dispose
2. 图表容器必须有明确的宽高，否则图表可能不显示
3. 动态更新时优先使用 `renderEcharts(nextOption)` 或 `chart.setOption(nextOption, true)` 做覆盖更新
4. 使用传统写法时，组件卸载时必须调用 `chart.dispose()` 释放资源
5. 使用传统写法时，需手动监听容器大小变化（`useResizeObserver` 或 `window.resize`）
