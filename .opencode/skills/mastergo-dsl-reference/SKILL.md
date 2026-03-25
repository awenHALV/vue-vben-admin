---
name: mastergo-dsl-reference
description: MasterGo设计稿DSL解析参考规范。当需要解析MasterGo设计稿DSL数据、提取设计元素（如组件、样式、布局）时使用。支持从getDsl工具获取的数据中解析FRAME、INSTANCE、TEXT、PATH等节点类型，提取layoutStyle、flexContainerInfo、fill、stroke等属性。
---

# MasterGo DSL 解析参考

本技能提供 MasterGo 设计稿 DSL 数据的解析规范和代码示例。

## 重要约束 ⚠️

**必须严格遵守以下规则：**

1. **禁止凭记忆或联想捏造内容** - 所有解析结果必须基于实际从 `mastergo_mcp__getDsl` 获取的 DSL 数据，不得根据常识、经验或推测填充内容

2. **严格遵循 DSL 生成（1:1 还原原则）** - 代码生成必须 1:1 还原设计稿中的布局、样式、组件和结构，**不得擅自修改或"优化"设计**：

   - **表格列顺序**：必须严格按照 DSL 中 `Header Row` 的子元素顺序生成表格列，不得增删或调整顺序
   - **表格列名**：必须使用 `Header Row` 中提取的文本作为列标题，不得修改或翻译
   - **表格数据字段**：必须基于 DSL 中数据行的实际内容确定，不得添加设计稿中不存在的字段
   - **单元格内容类型**：必须准确识别每个单元格的内容类型（TEXT/INSTANCE/FRAME），特别是包含标签的单元格（类型为 FRAME 而非 INSTANCE）
   - **标签颜色**：必须使用 `componentInfo.properties.Preset` 或背景色匹配 Ant Design 预设颜色

3. **遇到拿不准的找用户确认** - 当 DSL 数据存在以下情况时，必须向用户确认：

   - 文本内容为空或无法解析
   - 组件类型识别不明确
   - 某些字段的含义不确定
   - 设计稿与预期不符

   **确认方式：**

   - 提供选项让用户选择
   - 询问用户正确答案
   - 说明不确定性及可能的影响

## 代码生成规范

作为专业前端开发工程师，基于 MasterGo 设计稿数据生成代码时需遵循以下规范：

### 1. 样式规范

**严格遵循设计稿参数**：

- **颜色**：使用 DSL 中 `styles` 字典提取的精确色值（如 `#1677FF`、`rgba(0,0,0,0.88)`）
- **字体**：严格使用 `font_0:xx` 中的 family、size、lineHeight
- **间距**：使用 `layoutStyle` 和 `flexContainerInfo` 中的 gap、padding 精确值
- **圆角**：使用 `borderRadius` 原始值（如 `"8px"`）
- **REM 适配**：将 px 转换为 rem（默认 1rem = 16px）
  ```scss
  // 示例
  width: 1680px; → width: 105rem;  // 1680/16
  gap: 16px; → gap: 1rem;
  ```

**禁止行为**：

- ❌ 不得擅自修改设计稿的颜色、间距、圆角等参数
- ❌ 不得"优化"或"美化"设计稿样式
- ❌ 不得使用近似值代替精确值

### 3. 代码结构

**组件化拆分**：

```
src/
├── components/
│   ├── FilterCard/          # 筛选卡片组件
│   ├── DataTable/           # 数据表格组件
│   └── common/              # 公共组件
├── views/
│   └── VirtualPowerPlant/   # 页面级组件
├── assets/
│   ├── images/              # 设计稿图片资源
│   └── icons/               # SVG图标
└── utils/
    └── dslParser.ts         # DSL解析工具
```

**工程化规范**：

- 组件文件使用 PascalCase 命名（如 `FilterCard.vue`）
- 每个组件独立目录，包含 `index.vue` 和样式文件
- 注释清晰，关键逻辑说明用途
- 符合 TypeScript 类型规范
- **作者信息**：每个代码文件顶部必须添加作者注释
  ```vue
  <!-- FilterCard.vue -->
  <!-- 作者：inspur-iep-ai -->
  <!-- 生成时间：2026-03-20 -->
  ```
  ```typescript
  // utils/dslParser.ts
  // 作者：inspur-iep-ai
  // 生成时间：2026-03-20
  ```

### 4. 表格生成规范

**必须 1:1 还原设计稿的表格结构**：

1. **列数必须一致**：代码中的表格列数必须与 DSL 中 `Header Row` 的子元素数量完全一致
2. **列名必须使用原文**：使用 `extractTextFromNode(headerCell)` 提取的文本作为列标题
3. **列顺序不得调整**：必须按照 `Header Row.children` 数组的顺序生成
4. **列宽必须还原**：使用 `headerCell.layoutStyle.width` 作为列宽
5. **单元格类型必须正确识别**：
   - `INSTANCE` 类型 → 普通文本列
   - `FRAME` 类型（包含 `INSTANCE` 子元素）→ 标签列或操作列

**表格生成检查清单**：

```typescript
// 生成代码前验证
function validateTableColumns(dslColumns: string[], generatedColumns: any[]): boolean {
  // 1. 数量检查
  if (dslColumns.length !== generatedColumns.length) {
    console.error(`列数不匹配: DSL=${dslColumns.length}, 代码=${generatedColumns.length}`);
    return false;
  }

  // 2. 名称检查
  for (let i = 0; i < dslColumns.length; i++) {
    if (dslColumns[i] !== generatedColumns[i].title) {
      console.error(
        `列名不匹配 [${i}]: DSL="${dslColumns[i]}", 代码="${generatedColumns[i].title}"`,
      );
      return false;
    }
  }

  return true;
}
```

### 5. 资源处理

**自动下载资源**：

- 使用 `mastergo_mcp__getD2c` 获取设计稿中的图片和 SVG 资源
- 存放路径：`src/assets/images/` 和 `src/assets/icons/`
- 路径映射：确保代码中引用的路径与实际下载路径一致

**示例**：

```typescript
// DSL中的图片引用
"image": {
  "abc123.png": "https://.../abc123.png"
}

// 代码中使用
<img src="@/assets/images/abc123.png" />
```

### 5. 不确定性处理

**遇到以下情况必须询问用户**：

- 设计稿中某些区域内容为空
- 无法确定组件的具体用途
- 样式参数不明确或缺失
- 交互逻辑未在设计稿中体现

**询问模板**：

```
我注意到设计稿中 [XX位置] 存在以下情况：
- [具体描述]

请确认：
1. [选项A]
2. [选项B]
3. 其他（请说明）
```

## 完整 DSL 解析示例

### 示例 1: 读取完整 DSL 并解析表格

```typescript
/**
 * 完整的表格解析流程
 * 注意：必须先读取完整DSL，再进行解析
 */
async function parseTableFromDSL(fileId: string, layerId: string) {
  // 1. 获取完整DSL数据
  const dslData = await mastergo_mcp__getDsl(fileId, layerId);
  const root = dslData.dsl.nodes[0];
  const styles = dslData.dsl.styles;

  // 2. 找到 DataTableCard
  const dataTableCard = findNodeByName(root, 'DataTableCard');
  if (!dataTableCard) {
    throw new Error('未找到 DataTableCard');
  }

  // 3. 提取表格列信息
  const columns = extractTableColumns(dataTableCard);
  console.log(
    '提取的表格列:',
    columns.map((c) => c.title),
  );
  // 输出: ['序号', '名称', '编码', '社会信用代码', '供电单位', '资源类型', '电厂类型', '参与市场类型', '操作']

  // 4. 生成 Vue3 代码
  const vueCode = generateVue3Table(columns);

  return { columns, vueCode };
}

// 辅助函数：递归查找节点
function findNodeByName(node: Node, name: string): Node | null {
  if (node.name === name) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByName(child, name);
      if (found) return found;
    }
  }
  return null;
}
```

### 示例 2: 标签列识别

```typescript
/**
 * 识别标签列并提取颜色
 *
 * DSL结构示例:
 * {
 *   "type": "FRAME",
 *   "name": "Cell 6",
 *   "children": [{
 *     "type": "INSTANCE",
 *     "name": "Tag",
 *     "componentInfo": {
 *       "properties": {
 *         "Preset": "Magenta"  // <-- 关键属性
 *       }
 *     },
 *     "children": [{
 *       "type": "TEXT",
 *       "text": [{ "text": "充电桩" }]
 *     }]
 *   }]
 * }
 */
function extractTagColumn(cell: Node, headerText: string): TableColumn {
  const tagInstance = cell.children?.find((c) => c.type === 'INSTANCE');
  const preset = tagInstance?.componentInfo?.properties?.Preset || 'default';
  const tagText = extractTextFromNode(tagInstance);

  return {
    title: headerText,
    dataIndex: 'resourceType', // 根据headerText推断
    key: 'resourceType',
    contentType: 'tag',
    tagConfig: {
      colorPreset: mapPresetToAntdColor(preset),
      text: tagText,
    },
  };
}
```

### 示例 3: 1:1 列生成验证

```typescript
/**
 * 确保生成的代码列与设计稿完全一致
 */
function generateTableWithValidation(dslData: any): string {
  const root = dslData.dsl.nodes[0];
  const dataTableCard = findNodeByName(root, 'DataTableCard');

  // 提取DSL中的列
  const dslColumns = extractTableColumns(dataTableCard);

  // 生成代码
  const columnsCode = dslColumns.map((col) => ({
    title: col.title,
    dataIndex: col.dataIndex,
    key: col.key,
    width: col.width,
    // ...其他属性
  }));

  // 验证：检查DSL列与生成列是否一致
  const dslTitles = dslColumns.map((c) => c.title);
  const codeTitles = columnsCode.map((c) => c.title);

  if (JSON.stringify(dslTitles) !== JSON.stringify(codeTitles)) {
    console.error('列不匹配!');
    console.error('DSL列:', dslTitles);
    console.error('代码列:', codeTitles);
    throw new Error('表格列与设计稿不一致');
  }

  return JSON.stringify(columnsCode, null, 2);
}
```

## 快速参考

**获取 DSL 数据**：

```typescript
mastergo_mcp__getDsl(fileId, layerId);
```

**核心解析能力**： | 能力 | 文档 | |------|------| | 节点类型 | [references/node-types.md](references/node-types.md) | | 布局系统 | [references/layout.md](references/layout.md) | | 样式解析 | [references/styles.md](references/styles.md) | | **表格识别** | [references/table-patterns.md](references/table-patterns.md) | | **标签识别** | [references/table-patterns.md#多色彩标签识别](references/table-patterns.md) |

**DSL 根结构**：

```typescript
{
  "dsl": {
    "styles": {},    // 样式字典 (paint_0:xx, font_0:xx)
    "nodes": [],     // 节点树
    "components": {} // 组件定义
  },
  "rules": [],       // 生成规则
  "componentDocumentLinks": [] // 组件文档链接
}
```

## 核心类型

| 类型       | 用途      | 关键属性                                             |
| ---------- | --------- | ---------------------------------------------------- |
| `FRAME`    | 容器/页面 | `layoutStyle`, `flexContainerInfo`, `children`       |
| `INSTANCE` | 组件实例  | `componentInfo`, `borderRadius`, `flexContainerInfo` |
| `TEXT`     | 文本      | `text`, `textColor`, `textAlign`, `font`             |
| `PATH`     | SVG 路径  | `path` (SVG 数据)                                    |

详细类型定义 → [references/node-types.md](references/node-types.md)

## 布局解析

**layoutStyle** - 所有节点通用：

```typescript
{
  width: number,
  height: number,
  relativeX: number,  // 相对于父元素的X偏移
  relativeY: number   // 相对于父元素的Y偏移
}
```

**flexContainerInfo** - Flex 布局容器：

```typescript
{
  flexDirection: "row" | "column",
  mainSizing: "auto" | "fixed" | "fill",
  crossSizing: "auto" | "fixed" | "fill",
  alignItems?: "center" | "start" | "end" | "stretch",
  justifyContent?: "center" | "start" | "end" | "space-between",
  gap?: string,       // e.g. "16px"
  padding?: string    // e.g. "0px 4px"
}
```

详细布局属性 → [references/layout.md](references/layout.md)

## 样式解析

**styles 字典** - 通过 key 引用：

Paint 样式 (填充/描边)：

```typescript
{
  "paint_0:36": {
    value: ["rgba(0, 0, 0, 0.88)"],
    token: "填充/colorText"
  }
}
```

Font 样式 (字体)：

```typescript
{
  "font_0:40": {
    value: {
      family: "SF Pro Text",
      size: 14,
      style: "Regular",
      lineHeight: "22"
    },
    token: "文字/Base/Base Normal"
  }
}
```

详细样式定义 → [references/styles.md](references/styles.md)

## 组件解析

**componentInfo** - 组件实例信息：

```typescript
{
  "description": "import { Button } from 'antd'; ...", // 组件代码
  "properties": {
    "Type": "Basic",
    "State": "Default",
    "Size": "Large"
  }
}
```

## 递归遍历模式

```typescript
function traverseNodes(node, callback, depth = 0) {
  callback(node, depth);
  for (const child of node.children || []) {
    traverseNodes(child, callback, depth + 1);
  }
}

// 使用示例：收集所有文本
const texts = [];
traverseNodes(rootNode, (n) => {
  if (n.type === 'TEXT') {
    texts.push({
      content: n.text?.[0]?.text,
      font: n.text?.[0]?.font,
      color: n.textColor?.[0]?.color,
    });
  }
});
```

## 常见属性速查

| 属性         | 位置                            | 示例                |
| ------------ | ------------------------------- | ------------------- |
| 背景色       | `fill` → 引用`styles`中的 paint | `#FFFFFF`           |
| 边框色       | `strokeColor` → 引用`styles`    | `rgba(0,0,0,0.15)`  |
| 圆角         | `borderRadius`                  | `"4px"`             |
| 透明度       | `opacity`                       | `0.8`               |
| SVG 路径     | `path[].data`                   | SVG path data       |
| 文字内容     | `text[].text`                   | `"提交"`            |
| 字体引用     | `text[].font`                   | `"font_0:40"`       |
| 文字颜色     | `textColor[].color`             | `"paint_0:36"`      |
| **标签背景** | `INSTANCE.fill`                 | `#f6ffed` (success) |
| **标签文字** | `componentInfo.properties.Text` | `"已通过"`          |

## 表格与标签识别

### 表格识别

**识别特征**：

- 容器 FRAME 包含 Header 子 FRAME（表头行）和多个数据行
- 每行包含多个水平排列的单元格 FRAME
- 单元格内有 TEXT 或 INSTANCE（标签）内容

```typescript
// 判断是否为表格
function isTable(node) {
  if (node.type !== 'FRAME') return false;

  const children = node.children || [];
  // 检查是否有表头行和数据行
  const hasHeader = children.some((c) => c.name?.toLowerCase().includes('header'));
  const hasRows = children.some((c) => c.name?.toLowerCase().includes('row'));

  return hasHeader || hasRows;
}
```

### 多色彩标签识别

**标签组件特征**：

- `type === 'INSTANCE'`
- 命名包含: tag/badge/label/pill/status/chip
- 或 `componentInfo.properties` 包含 Color/Status
- 小尺寸(width < 100)、圆角、有背景色填充

```typescript
// 提取标签信息
function extractTag(node, styles) {
  const tagText =
    node.componentInfo?.properties?.Text ||
    node.children?.find((c) => c.type === 'TEXT')?.text?.[0]?.text;

  // 提取颜色 - 支持预设色和自定义色
  const fillRef = node.fill?.[0];
  const colorValue = styles[fillRef]?.value?.[0];
  const color = matchToPresetColor(colorValue) || colorValue; // success/error/...

  return { text: tagText, color };
}
```

**Ant Design 预设颜色映射**（含 Preset 属性映射）： | DSL 颜色值 | Preset 属性值 | Ant Design Tag color | |-----------|--------------|---------------------| | `#52c41a` / `#f6ffed` | `Success` / `Green` | `success` | | `#ff4d4f` / `#fff1f0` | `Error` / `Red` | `error` | | `#faad14` / `#fffbe6` | `Warning` / `Gold` | `warning` | | `#1677ff` / `#e6f4ff` | `Processing` / `Blue` | `processing` | | `#eb2f96` / `#fff0f6` | `Magenta` | `magenta` | | `#fa541c` / `#fff2e8` | `Volcano` | `volcano` | | `#fa8c16` / `#fff7e6` | `Orange` | `orange` | | `#a0d911` / `#fcffe6` | `Lime` | `lime` | | `#73d13d` / `#f6ffed` | `Green` | `green` | | `#13c2c2` / `#e6fffb` | `Cyan` | `cyan` | | `#1890ff` / `#e6f7ff` | `Blue` / `GeekBlue` | `blue` / `geekblue` | | `#722ed1` / `#f9f0ff` | `Purple` | `purple` | | `#eb2f96` / `#fff0f6` | `Pink` | `pink` |

**提取标签颜色的优先级**：

1. 首先检查 `componentInfo.properties.Preset` 属性
2. 其次检查 `fill` 引用的颜色值，匹配上表
3. 最后检查文字颜色反推标签类型

**完整表格与标签解析** → [references/table-patterns.md](references/table-patterns.md)
