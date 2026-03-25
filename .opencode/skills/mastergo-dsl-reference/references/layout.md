# MasterGo DSL 布局属性详解

## layoutStyle - 基础布局

所有节点都包含 layoutStyle 属性：

```typescript
{
  "layoutStyle": {
    "width": 120,      // 宽度 (px)
    "height": 22,      // 高度 (px)
    "relativeX": 0,    // 相对于父元素的X偏移
    "relativeY": 0     // 相对于父元素的Y偏移
  }
}
```

**单位**: 所有数值都是像素值，无需额外转换。

## flexContainerInfo - Flex 布局

当节点作为 Flex 容器时，包含此属性：

```typescript
{
  "flexContainerInfo": {
    "flexDirection": "row",           // 主轴方向
    "mainSizing": "auto",             // 主轴尺寸模式
    "crossSizing": "auto",            // 交叉轴尺寸模式
    "alignItems": "center",           // 交叉轴对齐
    "justifyContent": "start",       // 主轴对齐
    "gap": "16px",                    // 间距
    "padding": "16px"                 // 内边距
  }
}
```

### flexDirection 取值

| 值                 | 说明               |
| ------------------ | ------------------ |
| `"row"`            | 水平排列（左到右） |
| `"column"`         | 垂直排列（上到下） |
| `"row-reverse"`    | 水平反向排列       |
| `"column-reverse"` | 垂直反向排列       |

### sizing 取值

| 值        | 说明         |
| --------- | ------------ |
| `"auto"`  | 内容自适应   |
| `"fixed"` | 固定尺寸     |
| `"fill"`  | 填充可用空间 |

### alignItems 取值

| 值          | 说明     | CSS 对应     |
| ----------- | -------- | ------------ |
| `"start"`   | 起始对齐 | `flex-start` |
| `"end"`     | 结束对齐 | `flex-end`   |
| `"center"`  | 居中对齐 | `center`     |
| `"stretch"` | 拉伸填充 | `stretch`    |

### justifyContent 取值

| 值                | 说明     | CSS 对应        |
| ----------------- | -------- | --------------- |
| `"start"`         | 起始对齐 | `flex-start`    |
| `"end"`           | 结束对齐 | `flex-end`      |
| `"center"`        | 居中对齐 | `center`        |
| `"space-between"` | 两端对齐 | `space-between` |
| `"space-around"`  | 环绕对齐 | `space-around`  |

### gap/padding 格式

```typescript
// 单值：所有方向相同
gap: '16px';

// 双值：水平 垂直
gap: '16px 8px';

// 四值：上 右 下 左
padding: '8px 16px 8px 16px';
```

## 转换为 CSS

### Flex 容器

```typescript
function toFlexCSS(flexInfo) {
  const css = {
    display: 'flex',
    'flex-direction': flexInfo.flexDirection,
    'align-items': flexInfo.alignItems,
    'justify-content': flexInfo.justifyContent,
  };

  if (flexInfo.gap) {
    const [h, v] = flexInfo.gap.split(' ');
    css['gap'] = v ? `${h} ${v}` : h;
  }

  if (flexInfo.padding) {
    css.padding = flexInfo.padding;
  }

  return css;
}
```

### 定位样式

```typescript
function toPositionCSS(layoutStyle) {
  return {
    width: layoutStyle.width,
    height: layoutStyle.height,
    'margin-left': layoutStyle.relativeX,
    'margin-top': layoutStyle.relativeY,
  };
}
```

## 布局模式检测

```typescript
// 检测是否为Flex容器
function isFlexContainer(node) {
  return !!node.flexContainerInfo;
}

// 检测布局方向
function getMainAxis(node) {
  return node.flexContainerInfo?.flexDirection || 'row';
}

// 计算是否为水平布局
function isHorizontal(node) {
  const dir = node.flexContainerInfo?.flexDirection;
  return dir === 'row' || dir === 'row-reverse';
}
```

## 典型布局结构

### 页面布局

```typescript
{
  type: "FRAME",
  name: "Page",
  layoutStyle: { width: 1440, height: 900 },
  flexContainerInfo: {
    flexDirection: "column",
    mainSizing: "auto",
    crossSizing: "fixed"
  },
  children: [
    { type: "FRAME", name: "Header", ... },
    { type: "FRAME", name: "Content", ... },
    { type: "FRAME", name: "Footer", ... }
  ]
}
```

### 列表项

```typescript
{
  type: "FRAME",
  name: "ListItem",
  flexContainerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: "12px"
  },
  children: [
    { type: "PATH", name: "Icon", ... },
    { type: "TEXT", name: "Title", ... },
    { type: "INSTANCE", name: "Arrow", ... }
  ]
}
```

### 表单行

```typescript
{
  type: "FRAME",
  name: "FormRow",
  flexContainerInfo: {
    flexDirection: "row",
    mainSizing: "fill",
    crossSizing: "fixed",
    gap: "16px"
  },
  children: [
    { type: "TEXT", name: "Label", layoutStyle: { width: 80 } },
    { type: "INSTANCE", name: "Input", layoutStyle: { width: 200 } }
  ]
}
```
