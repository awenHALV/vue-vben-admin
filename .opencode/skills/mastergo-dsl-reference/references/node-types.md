# MasterGo DSL 节点类型详解

## FRAME - 容器框架

最基础的容器类型，用于构建页面布局和分组。

```typescript
{
  "type": "FRAME",
  "id": "1:142150",
  "name": "MainContent",
  "layoutStyle": {
    "width": 1680,
    "height": 1024,
    "relativeX": 0,
    "relativeY": 0
  },
  "flexContainerInfo": {
    "flexDirection": "column",
    "mainSizing": "auto",
    "crossSizing": "fixed",
    "gap": "16px"
  },
  "children": [
    // 子节点数组
  ]
}
```

## INSTANCE - 组件实例

代表一个组件实例，继承自组件库。包含组件代码模板。

```typescript
{
  "type": "INSTANCE",
  "id": "1:144554",
  "name": "Type[a0]=Basic",  // 组件名 + 属性变体
  "layoutStyle": {
    "width": 120,
    "height": 22,
    "relativeX": 0,
    "relativeY": 0
  },
  "borderRadius": "4px",
  "flexContainerInfo": {
    "flexDirection": "row",
    "alignItems": "center",
    "mainSizing": "auto",
    "crossSizing": "auto",
    "gap": "4px",
    "padding": "0px 4px"
  },
  "componentInfo": {
    "description": "import { Breadcrumb } from 'antd';\nimport React from 'react';\n\nconst App = () => (\n  <Breadcrumb>\n    <Breadcrumb.Item>Home</Breadcrumb.Item>\n  </Breadcrumb>\n);",
    "properties": {
      "Type": "Basic"
    }
  },
  "children": []
}
```

**componentInfo.properties** 可能的值：

- `Type`: Basic, Outline, Text, Primary, etc.
- `State`: Default, Hover, Active, Disabled, Current
- `Size`: Small, Default, Large
- `Status`: Default, Loading

## TEXT - 文本节点

包含文本内容和格式信息。

```typescript
{
  "type": "TEXT",
  "id": "1:144554/0:2048/0:1997",
  "name": "Button Text",
  "layoutStyle": {
    "width": 112,
    "height": 22,
    "relativeX": 4,
    "relativeY": 0
  },
  "text": [
    {
      "text": "提交",
      "font": "font_0:40"
    }
  ],
  "textColor": [
    {
      "start": 0,
      "end": 8,
      "color": "paint_0:36"  // 引用styles中的paint
    }
  ],
  "textAlign": "left",
  "textMode": "single-line"  // 或 "multi-line"
}
```

**textColor 解析**：

- `start/end`: 文字颜色应用的字符范围
- `color`: 样式引用 ID，需要在 `dsl.styles` 中查找

## PATH - SVG 路径

用于图标、插图等矢量图形。

```typescript
{
  "type": "PATH",
  "id": "1:142200/0:3365/0:20",
  "name": "Vector",
  "layoutStyle": {
    "width": 17.812,
    "height": 12,
    "relativeX": 3.09,
    "relativeY": 6
  },
  "path": [
    {
      "fill": "paint_0:21",
      "data": "M17.6253 0C17.6253 0..."
    }
  ]
}
```

## 节点属性完整列表

| 属性                | 类型    | 说明                                   |
| ------------------- | ------- | -------------------------------------- |
| `type`              | string  | 节点类型：FRAME, INSTANCE, TEXT, PATH  |
| `id`                | string  | 唯一标识符 (格式: parentId/childIndex) |
| `name`              | string  | 节点名称/标签                          |
| `layoutStyle`       | object  | 位置和尺寸                             |
| `flexContainerInfo` | object? | Flex 布局信息（仅容器）                |
| `borderRadius`      | string? | 圆角值，如 "4px"                       |
| `fill`              | array?  | 填充色数组                             |
| `strokeColor`       | array?  | 描边色数组                             |
| `strokeWidth`       | number? | 描边宽度                               |
| `strokeType`        | string? | 描边类型：solid, dashed                |
| `strokeAlign`       | string? | 描边对齐：inside, outside, center      |
| `effect`            | array?  | 效果（阴影等）                         |
| `opacity`           | number? | 透明度 0-1                             |
| `flexGrow`          | number? | Flex 增长系数                          |
| `flexShrink`        | number? | Flex 收缩系数                          |
| `text`              | array?  | 文本内容（TEXT 节点）                  |
| `textColor`         | array?  | 文本颜色（TEXT 节点）                  |
| `textAlign`         | string? | 文本对齐（TEXT 节点）                  |
| `textMode`          | string? | 文本模式（TEXT 节点）                  |
| `path`              | array?  | SVG 路径数据（PATH 节点）              |
| `componentInfo`     | object? | 组件信息（INSTANCE 节点）              |
| `children`          | array?  | 子节点数组                             |

## 遍历示例

```typescript
// 深度遍历所有节点
function walkTree(node, handler, depth = 0) {
  const result = handler(node, depth);
  if (result !== false && node.children) {
    for (const child of node.children) {
      walkTree(child, handler, depth + 1);
    }
  }
}

// 按类型查找
function findByType(node, type) {
  const results = [];
  walkTree(node, (n) => {
    if (n.type === type) results.push(n);
  });
  return results;
}

// 获取所有文本节点
const textNodes = findByType(rootNode, 'TEXT');

// 获取所有组件实例
const components = findByType(rootNode, 'INSTANCE');
```
