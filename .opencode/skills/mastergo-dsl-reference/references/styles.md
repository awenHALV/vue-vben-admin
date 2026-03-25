# MasterGo DSL 样式详解

## styles 字典结构

DSL 根节点包含 `styles` 字典，存储所有可复用的样式定义：

```typescript
{
  "dsl": {
    "styles": {
      // key 格式: 类型_序号:ID
      "paint_0:36": { ... },  // 填充色
      "font_0:40": { ... },    // 字体
      "effect_0:7217": { ... } // 效果（阴影等）
    }
  }
}
```

## Paint 样式 (填充/描边)

### 纯色填充

```typescript
{
  "paint_0:24148": {
    "value": ["#FFFFFF"],
    "token": "填充/colorBgContainer"
  }
}
```

### 透明度填充

```typescript
{
  "paint_0:36": {
    "value": ["rgba(0, 0, 0, 0.88)"],
    "token": "填充/colorText"
  }
}
```

### 无填充

```typescript
{
  "paint_0:3366": {
    "value": []
  }
}
```

### 渐变填充 (如果有)

```typescript
{
  "paint_gradient": {
    "value": [
      {
        "type": "GRADIENT_LINEAR",
        "stops": [
          { "position": 0, "color": "#FF0000" },
          { "position": 1, "color": "#0000FF" }
        ],
        "angle": 90
      }
    ]
  }
}
```

## Font 样式 (字体)

```typescript
{
  "font_0:40": {
    "value": {
      "family": "SF Pro Text",
      "size": 14,
      "style": "Regular",
      "decoration": "none",     // "none" | "underline" | "line-through"
      "case": "none",           // "none" | "uppercase" | "lowercase"
      "lineHeight": "22",
      "letterSpacing": "auto"
    },
    "token": "文字/Base/Base Normal"
  }
}
```

### 转换为 CSS font

```typescript
function fontToCSS(fontStyle) {
  return {
    'font-family': fontStyle.value.family,
    'font-size': `${fontStyle.value.size}px`,
    'font-weight': parseFontWeight(fontStyle.value.style),
    'text-decoration': fontStyle.value.decoration,
    'line-height': fontStyle.value.lineHeight,
    'letter-spacing': fontStyle.value.letterSpacing,
  };
}

function parseFontWeight(style) {
  const weightMap = {
    Thin: 100,
    ExtraLight: 200,
    Light: 300,
    Regular: 400,
    Medium: 500,
    SemiBold: 600,
    Bold: 700,
    ExtraBold: 800,
    Black: 900,
  };
  return weightMap[style] || 400;
}
```

## Effect 样式 (效果)

### 阴影

```typescript
{
  "effect_0:7217": {
    "value": ["box-shadow: 0px 2px 0px 0px rgba(255, 255, 255, 0.04);"]
  }
}
```

### 多层阴影

```typescript
{
  "effect_multi": {
    "value": [
      "box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);",
      "box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.15);"
    ]
  }
}
```

## 样式引用解析

节点通过引用 ID 使用样式：

```typescript
// TEXT 节点引用字体
{
  "text": [
    {
      "text": "按钮",
      "font": "font_0:40"  // 引用 styles["font_0:40"]
    }
  ],
  "textColor": [
    {
      "start": 0,
      "end": 2,
      "color": "paint_0:36"  // 引用 styles["paint_0:36"]
    }
  ]
}

// PATH 节点引用填充
{
  "path": [
    {
      "fill": "paint_0:21",
      "data": "..."
    }
  ]
}
```

## 样式解析工具

```typescript
interface ParsedColor {
  hex: string; // "#FFFFFF"
  rgba: string; // "rgba(255, 255, 255, 1)"
  opacity: number; // 0-1
}

/**
 * 解析样式值为实际颜色
 */
function resolveStyle(styles, styleRef) {
  if (!styleRef || !styles[styleRef]) {
    return null;
  }

  const style = styles[styleRef];
  const value = style.value;

  if (!value || value.length === 0) {
    return null; // 无填充
  }

  // 处理数组形式
  const colorValue = Array.isArray(value) ? value[0] : value;

  return parseColor(colorValue);
}

/**
 * 解析颜色字符串
 */
function parseColor(colorStr) {
  if (!colorStr) return null;

  // rgba 格式
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return {
      hex: rgbToHex(+r, +g, +b),
      rgba: `rgba(${r}, ${g}, ${b}, ${a || 1})`,
      opacity: a ? +a : 1,
    };
  }

  // hex 格式
  if (colorStr.startsWith('#')) {
    return {
      hex: colorStr,
      rgba: hexToRgba(colorStr),
      opacity: 1,
    };
  }

  return null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, 1)`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}
```

## 常见 Ant Design 设计令牌

| token                  | 典型值             | 用途       |
| ---------------------- | ------------------ | ---------- |
| `colorPrimaryBase`     | `#1677FF`          | 主色       |
| `colorBgContainer`     | `#FFFFFF`          | 容器背景   |
| `colorText`            | `rgba(0,0,0,0.88)` | 正文文字   |
| `colorTextHeading`     | `rgba(0,0,0,0.88)` | 标题文字   |
| `colorTextPlaceholder` | `rgba(0,0,0,0.25)` | 占位符文字 |
| `colorBorder`          | `rgba(0,0,0,0.15)` | 边框       |
| `colorSplit`           | `rgba(0,0,0,0.06)` | 分割线     |
| `colorFillAlter`       | `rgba(0,0,0,0.02)` | 交替填充   |
| `colorTextLightSolid`  | `#FFFFFF`          | 浅色文字   |

## 完整样式解析示例

```typescript
function resolveNodeStyles(node, styles) {
  const result = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // 布局
  if (node.layoutStyle) {
    result.width = node.layoutStyle.width;
    result.height = node.layoutStyle.height;
  }

  // 圆角
  if (node.borderRadius) {
    result.borderRadius = node.borderRadius;
  }

  // 透明度
  if (node.opacity !== undefined) {
    result.opacity = node.opacity;
  }

  // 文本样式
  if (node.type === 'TEXT' && node.text) {
    const textItem = node.text[0];
    if (textItem) {
      result.text = textItem.text;
      if (textItem.font) {
        result.font = resolveStyle(styles, textItem.font);
      }
    }
    if (node.textColor?.[0]?.color) {
      result.textColor = resolveStyle(styles, node.textColor[0].color);
    }
  }

  // 填充
  if (node.fill?.[0]) {
    result.fill = resolveStyle(styles, node.fill[0]);
  }

  // 描边
  if (node.strokeColor?.[0]) {
    result.stroke = resolveStyle(styles, node.strokeColor[0]);
    result.strokeWidth = node.strokeWidth;
  }

  return result;
}
```
