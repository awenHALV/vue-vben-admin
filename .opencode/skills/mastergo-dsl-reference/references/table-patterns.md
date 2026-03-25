# MasterGo DSL 表格与标签识别规范

## 表格列提取（1:1 还原原则）

### 完整的表格列提取流程

**核心原则**：表格列必须严格按照 DSL 中 `Header Row` 的顺序和内容生成，不得增删或修改。

```typescript
interface TableColumn {
  title: string; // 表头文本（来自Header Row）
  dataIndex: string; // 数据字段名
  key: string; // React/Vue key
  width?: number; // 列宽
  align?: 'left' | 'center' | 'right';
  contentType: 'text' | 'tag' | 'status' | 'action' | 'custom';
  tagConfig?: {
    // 标签列配置
    colorPreset: string; // Ant Design 预设颜色
    text: string;
  };
}

/**
 * 提取表格列信息 - 严格遵循1:1还原原则
 *
 * 示例DSL结构:
 * {
 *   "type": "FRAME",
 *   "name": "DataTableCard",
 *   "children": [
 *     {
 *       "type": "FRAME",
 *       "name": "*Table*",
 *       "children": [
 *         {
 *           "type": "FRAME",
 *           "name": "Table",
 *           "children": [
 *             { "type": "FRAME", "name": "Header Row", "children": [...] },
 *             { "type": "FRAME", "name": "Row", "children": [...] }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
function extractTableColumns(tableNode: Node): TableColumn[] {
  // 1. 找到表格容器下的 FRAME: Table
  const tableFrame = tableNode.children
    ?.find((c) => c.name === '*Table*')
    ?.children?.find((c) => c.name === 'Table');
  if (!tableFrame) {
    console.error('未找到 Table 结构');
    return [];
  }

  // 2. 提取 Header Row
  const headerRow = tableFrame.children?.find((c) => c.name === 'Header Row');
  if (!headerRow || !headerRow.children) {
    console.error('未找到 Header Row');
    return [];
  }

  // 3. 提取第一行数据作为样本（用于判断单元格内容类型）
  const dataRow = tableFrame.children?.find((c) => c.name === 'Row');

  // 4. 遍历 Header Row 的每个单元格，1:1生成列配置
  return headerRow.children.map((headerCell, index) => {
    // 提取表头文本
    const title = extractTextFromNode(headerCell);

    // 获取对应的数据单元格
    const dataCell = dataRow?.children?.[index];

    // 识别单元格内容类型
    const contentType = detectCellContentType(dataCell);

    const column: TableColumn = {
      title: title,
      dataIndex: `col${index}`,
      key: `col${index}`,
      width: headerCell.layoutStyle?.width,
      align: detectTextAlign(headerCell),
      contentType: contentType,
    };

    // 如果是标签类型，提取标签配置
    if (contentType === 'tag' && dataCell) {
      column.tagConfig = extractTagConfig(dataCell);
    }

    return column;
  });
}

/**
 * 从节点提取文本内容（递归查找）
 */
function extractTextFromNode(node: Node): string {
  if (!node) return '';

  // 如果是TEXT节点直接返回
  if (node.type === 'TEXT' && node.text?.[0]?.text) {
    return node.text[0].text;
  }

  // 递归查找子TEXT节点
  if (node.children) {
    for (const child of node.children) {
      const text = extractTextFromNode(child);
      if (text && !text.startsWith('_')) {
        return text;
      }
    }
  }

  return '';
}
```

### 单元格内容类型检测（区分 INSTANCE 和 FRAME）

```typescript
/**
 * 检测单元格内容类型
 *
 * 关键区别：
 * - INSTANCE: 普通文本内容（如"虚拟电厂名称"）
 *   示例: { type: "INSTANCE", children: [{ type: "TEXT", text: "虚拟电厂名称" }] }
 *
 * - FRAME: 包含标签等复杂内容（标签单元格外层是FRAME，内含INSTANCE）
 *   示例: {
 *     type: "FRAME",
 *     children: [{
 *       type: "INSTANCE",
 *       name: "Tag",
 *       componentInfo: { properties: { Preset: "Magenta" } },
 *       children: [{ type: "TEXT", text: "充电桩" }]
 *     }]
 *   }
 */
function detectCellContentType(cell: Node): 'text' | 'tag' | 'status' | 'action' | 'custom' {
  if (!cell) return 'text';

  const children = cell.children || [];

  // 类型1: INSTANCE - 普通文本单元格
  if (cell.type === 'INSTANCE') {
    return 'text';
  }

  // 类型2: FRAME 包含 INSTANCE - 通常是标签或复杂内容单元格
  if (cell.type === 'FRAME') {
    const instances = children.filter((child) => child.type === 'INSTANCE');

    // 检查是否包含标签
    const hasTagInstance = instances.some((child) => isTagComponent(child));
    if (hasTagInstance) {
      return 'tag';
    }

    // 检查是否为操作列（包含多个按钮）
    if (instances.length > 1) {
      return 'action';
    }

    // 默认为文本
    return 'text';
  }

  return 'text';
}

/**
 * 判断是否为标签组件
 * 特征：
 * 1. componentInfo.properties.Preset 存在（如 "Magenta", "Success"）
 * 2. 命名包含 tag/badge/label
 */
function isTagComponent(node: Node): boolean {
  if (node.type !== 'INSTANCE') return false;

  // 特征1: 组件属性中包含 Preset
  const preset = node.componentInfo?.properties?.Preset;
  if (preset) return true;

  // 特征2: 命名包含 tag/badge/label
  const name = node.name?.toLowerCase() || '';
  if (['tag', 'badge', 'label', 'status'].some((k) => name.includes(k))) return true;

  return false;
}

/**
 * 提取标签配置
 */
function extractTagConfig(cell: Node): { colorPreset: string; text: string } {
  const tagInstance = cell.children?.find((c) => c.type === 'INSTANCE' && isTagComponent(c));

  if (!tagInstance) {
    return { colorPreset: 'default', text: '' };
  }

  // 提取 Preset 值
  const preset = tagInstance.componentInfo?.properties?.Preset || 'default';

  // 提取标签文本
  const text = extractTextFromNode(tagInstance);

  // 映射到 Ant Design 预设颜色
  const antdPreset = mapPresetToAntdColor(preset);

  return {
    colorPreset: antdPreset,
    text: text,
  };
}

/**
 * Preset 到 Ant Design 颜色的映射
 *
 * MasterGo DSL 中的 Preset 值示例：
 * - "Magenta", "Red", "Volcano", "Orange", "Gold"
 * - "Lime", "Green", "Cyan", "Blue", "GeekBlue"
 * - "Purple", "Pink"
 * - "Success", "Processing", "Error", "Warning", "Default"
 */
function mapPresetToAntdColor(preset: string): string {
  const presetLower = preset.toLowerCase();

  // 状态类标签
  const statusMap: Record<string, string> = {
    success: 'success',
    processing: 'processing',
    error: 'error',
    warning: 'warning',
    default: 'default',
  };

  if (statusMap[presetLower]) {
    return statusMap[presetLower];
  }

  // 颜色类标签（Ant Design 预设色）
  const colorMap: Record<string, string> = {
    magenta: 'magenta',
    red: 'red',
    volcano: 'volcano',
    orange: 'orange',
    gold: 'gold',
    lime: 'lime',
    green: 'green',
    cyan: 'cyan',
    blue: 'blue',
    geekblue: 'geekblue',
    purple: 'purple',
    pink: 'pink',
  };

  return colorMap[presetLower] || 'default';
}
```

### 表格列生成 Vue3 代码示例

```typescript
/**
 * 根据DSL生成 Vue3 表格 columns 配置
 */
function generateVue3Columns(tableNode: Node): string {
  const columns = extractTableColumns(tableNode);

  const columnsCode = columns
    .map((col, index) => {
      let renderCode = '';

      // 根据内容类型生成 render 函数
      if (col.contentType === 'tag') {
        renderCode = `
    render: ({ text }) => h(Tag, { color: '${
      col.tagConfig?.colorPreset || 'default'
    }' }, () => text)`;
      } else if (col.contentType === 'action') {
        renderCode = `
    render: ({ record }) => h(Space, null, {
      default: () => [
        h(Button, { type: 'link', size: 'small', onClick: () => handleEdit(record) }, () => '编辑'),
        h(Popconfirm, { title: '确认删除?', onConfirm: () => handleDelete(record.id) }, {
          default: () => h(Button, { type: 'link', danger: true, size: 'small' }, () => '删除')
        })
      ]
    })`;
      }

      return `  {
    title: '${col.title}',
    dataIndex: 'col${index}',
    key: 'col${index}',
    width: ${col.width || 'undefined'},
    align: '${col.align || 'left'}'${renderCode}
  }`;
    })
    .join(',');

  return `const columns = [\n${columnsCode}\n];`;
}
```

## 表格结构识别

### 表格整体结构

表格通常由以下层级组成：

```
Table (FRAME) - 表格容器
├── Table Header (FRAME) - 表头行
│   ├── Header Cell (FRAME/INSTANCE) - 表头单元格
│   │   └── Header Text (TEXT)
│   ├── Header Cell (FRAME/INSTANCE)
│   └── ...
└── Table Body (FRAME) - 表格内容区
    ├── Table Row (FRAME) - 数据行
    │   ├── Cell (FRAME) - 单元格
    │   │   ├── Cell Content (TEXT/INSTANCE) - 单元格内容
    │   │   └── Tag/Status (INSTANCE) - 标签/状态
    │   ├── Cell (FRAME)
    │   └── ...
    ├── Table Row (FRAME)
    └── ...
```

### 表格识别特征

**表头识别** (`isTableHeader`):

```typescript
function isTableHeader(node: Node): boolean {
  // 特征1: 包含"Header"或"表头"的命名
  if (node.name?.toLowerCase().includes('header')) return true;

  // 特征2: 作为表格容器的直接子元素，且位置在顶部
  if (node.parent?.type === 'FRAME' && node.layoutStyle?.relativeY === 0) {
    // 检查是否包含多个水平排列的单元格
    const children = node.children || [];
    if (children.length > 1) {
      const allHorizontal = children.every((c, i, arr) => {
        if (i === 0) return true;
        return c.layoutStyle?.relativeX > arr[i - 1].layoutStyle?.relativeX;
      });
      if (allHorizontal) return true;
    }
  }

  return false;
}
```

**数据行识别** (`isTableRow`):

```typescript
function isTableRow(node: Node): boolean {
  // 特征1: 命名包含"Row"或"行"
  if (node.name?.toLowerCase().includes('row')) return true;

  // 特征2: 与表头类似的水平布局
  const children = node.children || [];
  if (children.length >= 2) {
    // 检查子元素是否水平排列且宽度均匀
    const isHorizontal = children.every((c, i, arr) => {
      if (i === 0) return true;
      return c.layoutStyle?.relativeX > arr[i - 1].layoutStyle?.relativeX;
    });

    // 检查是否为表格容器的子元素
    const isInTable = node.parent?.children?.some((sibling) =>
      sibling.name?.toLowerCase().includes('header'),
    );

    if (isHorizontal && isInTable) return true;
  }

  return false;
}
```

## 表格单元格内容识别

### 单元格内容类型检测

```typescript
enum CellContentType {
  TEXT = 'text', // 纯文本
  TAG = 'tag', // 彩色标签
  STATUS = 'status', // 状态指示器
  AVATAR = 'avatar', // 头像
  ICON_TEXT = 'icon-text', // 图标+文字
  ACTION = 'action', // 操作按钮组
  PROGRESS = 'progress', // 进度条
  LINK = 'link', // 链接
}

function detectCellContentType(cell: Node): CellContentType {
  const children = cell.children || [];

  // 单个子元素
  if (children.length === 1) {
    const child = children[0];

    // 纯文本
    if (child.type === 'TEXT') {
      return CellContentType.TEXT;
    }

    // 组件实例 - 进一步判断类型
    if (child.type === 'INSTANCE') {
      return detectInstanceType(child);
    }
  }

  // 多个子元素 - 可能是复合内容
  if (children.length > 1) {
    // 检查是否为图标+文字
    const hasIcon = children.some((c) => c.type === 'PATH');
    const hasText = children.some((c) => c.type === 'TEXT');
    if (hasIcon && hasText) return CellContentType.ICON_TEXT;

    // 检查是否为操作按钮组
    const hasButtons = children.filter((c) => c.type === 'INSTANCE').length > 1;
    if (hasButtons) return CellContentType.ACTION;
  }

  return CellContentType.TEXT;
}
```

## 多色彩标签识别

### 标签组件识别

**Tag 识别特征** (`isTag`):

```typescript
function isTag(node: Node): boolean {
  if (node.type !== 'INSTANCE') return false;

  const name = node.name?.toLowerCase() || '';
  const compProps = node.componentInfo?.properties || {};

  // 命名特征
  const tagKeywords = ['tag', 'badge', 'label', 'pill', 'status', 'chip'];
  if (tagKeywords.some((kw) => name.includes(kw))) return true;

  // 组件属性特征 (Ant Design Tag/Badge)
  if (compProps.Type || compProps.Color || compProps.Status) {
    return true;
  }

  // 视觉特征：小尺寸、圆角、有背景色
  const layout = node.layoutStyle;
  if (layout && layout.width < 100 && layout.height < 32) {
    if (node.borderRadius && node.fill?.length > 0) {
      return true;
    }
  }

  return false;
}
```

### 标签颜色提取

**从 INSTANCE 提取标签颜色**:

```typescript
interface TagColorInfo {
  type: 'preset' | 'custom';
  preset?: string; // Ant Design 预设颜色
  customColor?: string; // 自定义颜色值
  textColor: string; // 文字颜色
}

function extractTagColor(node: Node, styles: Record<string, any>): TagColorInfo {
  const compProps = node.componentInfo?.properties || {};
  const presetColors = [
    'success',
    'processing',
    'error',
    'warning',
    'default',
    'magenta',
    'red',
    'volcano',
    'orange',
    'gold',
    'lime',
    'green',
    'cyan',
    'blue',
    'geekblue',
    'purple',
    'pink',
    'grey',
  ];

  // 1. 检查组件属性中的颜色
  const propColor = compProps.Color || compProps.color;
  if (propColor && presetColors.includes(propColor.toLowerCase())) {
    return {
      type: 'preset',
      preset: propColor.toLowerCase(),
      textColor: getPresetTextColor(propColor),
    };
  }

  // 2. 检查填充色
  if (node.fill?.[0]) {
    const colorRef = node.fill[0];
    const colorValue = resolveStyle(styles, colorRef);

    // 匹配预设颜色
    const matchedPreset = matchToPresetColor(colorValue?.hex);
    if (matchedPreset) {
      return {
        type: 'preset',
        preset: matchedPreset,
        textColor: getPresetTextColor(matchedPreset),
      };
    }

    // 自定义颜色
    return {
      type: 'custom',
      customColor: colorValue?.hex || colorValue?.rgba,
      textColor: getContrastTextColor(colorValue),
    };
  }

  // 3. 从子元素文字颜色推断
  const textNode = findChildByType(node, 'TEXT');
  if (textNode?.textColor?.[0]?.color) {
    const textColor = resolveStyle(styles, textNode.textColor[0].color);
    // 根据文字颜色推断标签颜色
    const inferredPreset = inferPresetFromTextColor(textColor);
    if (inferredPreset) {
      return {
        type: 'preset',
        preset: inferredPreset,
        textColor: textColor?.hex || textColor?.rgba,
      };
    }
  }

  return { type: 'preset', preset: 'default', textColor: '#000000' };
}

/**
 * 匹配颜色到 Ant Design 预设
 */
function matchToPresetColor(hex: string): string | null {
  const colorMap: Record<string, string[]> = {
    success: ['#52c41a', '#f6ffed'],
    error: ['#ff4d4f', '#fff1f0'],
    warning: ['#faad14', '#fffbe6'],
    processing: ['#1677ff', '#e6f4ff'],
    magenta: ['#eb2f96', '#fff0f6'],
    red: ['#f5222d', '#fff1f0'],
    volcano: ['#fa541c', '#fff2e8'],
    orange: ['#fa8c16', '#fff7e6'],
    gold: ['#faad14', '#fffbe6'],
    lime: ['#a0d911', '#fcffe6'],
    green: ['#73d13d', '#f6ffed'],
    cyan: ['#13c2c2', '#e6fffb'],
    blue: ['#1890ff', '#e6f7ff'],
    geekblue: ['#2f4554', '#f0f5ff'],
    purple: ['#722ed1', '#f9f0ff'],
    pink: ['#eb2f96', '#fff0f6'],
  };

  for (const [preset, colors] of Object.entries(colorMap)) {
    if (colors.some((c) => c.toLowerCase() === hex?.toLowerCase())) {
      return preset;
    }
  }

  return null;
}
```

### 标签文字提取

```typescript
function extractTagText(node: Node): string {
  // 直接从组件属性读取
  const compProps = node.componentInfo?.properties;
  if (compProps?.Text || compProps?.text) {
    return compProps.Text || compProps.text;
  }

  // 从子TEXT节点读取
  const textNode = findChildByType(node, 'TEXT');
  if (textNode?.text?.[0]?.text) {
    return textNode.text[0].text;
  }

  // 从组件描述中解析（备选方案）
  const desc = node.componentInfo?.description || '';
  const textMatch = desc.match(/<Tag[^>]*>([^<]*)<\/Tag>/);
  if (textMatch) return textMatch[1];

  return '';
}
```

## 表格单元格解析示例

### 完整单元格解析流程

```typescript
interface TableCell {
  key: string;
  content: CellContent;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface CellContent {
  type: CellContentType;
  value: any;
  raw?: Node;
}

function parseTableCell(cell: Node, columnIndex: number, styles: Record<string, any>): TableCell {
  const contentType = detectCellContentType(cell);

  const cellData: TableCell = {
    key: `cell-${columnIndex}`,
    width: cell.layoutStyle?.width,
    content: { type: contentType, value: null },
  };

  switch (contentType) {
    case CellContentType.TAG:
      const tagInstance = findChildByType(cell, 'INSTANCE');
      if (tagInstance && isTag(tagInstance)) {
        cellData.content.value = {
          text: extractTagText(tagInstance),
          color: extractTagColor(tagInstance, styles),
        };
      }
      break;

    case CellContentType.TEXT:
      const textNode = findChildByType(cell, 'TEXT');
      if (textNode) {
        cellData.content.value = extractTagText(textNode);
      }
      break;

    case CellContentType.STATUS:
      const statusInstance = findChildByType(cell, 'INSTANCE');
      cellData.content.value = {
        status: statusInstance?.componentInfo?.properties?.Status || 'default',
        text: extractTagText(statusInstance),
      };
      break;

    case CellContentType.ACTION:
      const actions = (cell.children || [])
        .filter((c) => c.type === 'INSTANCE')
        .map((action) => ({
          type: action.componentInfo?.properties?.Type || 'link',
          text: extractTagText(action),
        }));
      cellData.content.value = actions;
      break;

    default:
      // 默认尝试提取文本
      cellData.content.value = extractNodeText(cell);
  }

  cellData.content.raw = cell;
  return cellData;
}
```

## 表格列配置生成

### 自动生成 Columns 配置

```typescript
interface ColumnConfig {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any) => any;
}

function generateTableColumns(
  headerRow: Node,
  sampleDataRow: Node,
  styles: Record<string, any>,
): ColumnConfig[] {
  const headerCells = headerRow.children || [];
  const dataCells = sampleDataRow?.children || [];

  return headerCells.map((headerCell, index) => {
    const dataCell = dataCells[index];
    const contentType = dataCell ? detectCellContentType(dataCell) : CellContentType.TEXT;

    const column: ColumnConfig = {
      title: extractNodeText(headerCell),
      dataIndex: `col${index}`,
      key: `col${index}`,
      width: headerCell.layoutStyle?.width,
      align: detectTextAlign(headerCell) as any,
    };

    // 根据内容类型添加 render 函数
    if (contentType === CellContentType.TAG) {
      column.render = (tagData: any) => ({
        component: 'Tag',
        props: {
          color: tagData.color?.preset || tagData.color?.customColor,
          children: tagData.text,
        },
      });
    } else if (contentType === CellContentType.ACTION) {
      column.render = (actions: any[]) => ({
        component: 'Space',
        props: { size: 'middle' },
        children: actions.map((action) => ({
          component: 'Button',
          props: { type: action.type === 'link' ? 'link' : 'text' },
          children: action.text,
        })),
      });
    }

    return column;
  });
}
```

## 典型表格 DSL 结构示例

### Ant Design Table 设计稿结构

```typescript
// 表格容器
{
  "type": "FRAME",
  "name": "Table",
  "layoutStyle": { "width": 1136, "height": 440 },
  "flexContainerInfo": {
    "flexDirection": "column",
    "gap": "0px"
  },
  "children": [
    // 表头行
    {
      "type": "FRAME",
      "name": "Table Header",
      "layoutStyle": { "width": 1136, "height": 56 },
      "flexContainerInfo": {
        "flexDirection": "row",
        "alignItems": "center"
      },
      "children": [
        {
          "type": "FRAME",
          "name": "Header Cell 1",
          "layoutStyle": { "width": 200 },
          "children": [{ "type": "TEXT", "text": [{"text": "姓名"}] }]
        },
        {
          "type": "FRAME",
          "name": "Header Cell 2",
          "children": [{ "type": "TEXT", "text": [{"text": "状态"}] }]
        }
      ]
    },
    // 数据行
    {
      "type": "FRAME",
      "name": "Table Row",
      "layoutStyle": { "height": 56 },
      "children": [
        {
          "type": "FRAME",
          "name": "Cell 1",
          "children": [{ "type": "TEXT", "text": [{"text": "张三"}] }]
        },
        {
          "type": "FRAME",
          "name": "Cell 2",
          "children": [
            {
              "type": "INSTANCE",
              "name": "Tag[Color=success]",
              "componentInfo": {
                "properties": { "Color": "success", "Text": "已完成" }
              },
              "fill": [{ "color": "paint_0:xxx" }],  // 绿色背景
              "children": [
                { "type": "TEXT", "text": [{"text": "已完成"}] }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 多色彩标签行示例

```typescript
// 包含多种颜色标签的数据行
{
  "type": "FRAME",
  "name": "Table Row",
  "children": [
    // 单元格1: 绿色成功标签
    {
      "type": "FRAME",
      "name": "Cell",
      "children": [{
        "type": "INSTANCE",
        "name": "Tag",
        "componentInfo": { "properties": { "Color": "success" } },
        "fill": [{ "color": "paint_0:100" }],  // #f6ffed (浅绿背景)
        "borderRadius": "4px",
        "children": [{
          "type": "TEXT",
          "text": [{ "text": "已通过" }],
          "textColor": [{ "color": "paint_0:101" }]  // #52c41a (绿色文字)
        }]
      }]
    },
    // 单元格2: 红色错误标签
    {
      "type": "FRAME",
      "name": "Cell",
      "children": [{
        "type": "INSTANCE",
        "name": "Tag",
        "fill": [{ "color": "paint_0:200" }],  // #fff1f0 (浅红背景)
        "borderRadius": "4px",
        "children": [{
          "type": "TEXT",
          "text": [{ "text": "已拒绝" }],
          "textColor": [{ "color": "paint_0:201" }]  // #ff4d4f (红色文字)
        }]
      }]
    },
    // 单元格3: 蓝色处理中标签
    {
      "type": "FRAME",
      "name": "Cell",
      "children": [{
        "type": "INSTANCE",
        "name": "Tag",
        "componentInfo": { "properties": { "Color": "processing" } },
        "fill": [{ "color": "paint_0:300" }],  // #e6f4ff (浅蓝背景)
        "borderRadius": "4px",
        "children": [{
          "type": "TEXT",
          "text": [{ "text": "处理中" }],
          "textColor": [{ "color": "paint_0:301" }]  // #1677ff (蓝色文字)
        }]
      }]
    }
  ]
}
```

## 实际案例：虚拟电厂表格解析

### DSL 结构分析

```typescript
// 虚拟电厂表格的DSL结构示例
const virtualPowerPlantTableDSL = {
  type: 'FRAME',
  name: 'DataTableCard',
  children: [
    // 表格容器
    {
      type: 'FRAME',
      name: '*Table*',
      children: [
        {
          type: 'FRAME',
          name: 'Table',
          children: [
            // 表头行（9列）
            {
              type: 'FRAME',
              name: 'Header Row',
              children: [
                {
                  /* 列1: 序号 */
                },
                {
                  /* 列2: 名称 */
                },
                {
                  /* 列3: 编码 */
                },
                {
                  /* 列4: 社会信用代码 */
                },
                {
                  /* 列5: 供电单位 */
                },
                {
                  /* 列6: 资源类型 */
                },
                {
                  /* 列7: 电厂类型 */
                },
                {
                  /* 列8: 参与市场类型 */
                },
                {
                  /* 列9: 操作 */
                },
              ],
            },
            // 数据行
            {
              type: 'FRAME',
              name: 'Row',
              children: [
                // 列1: INSTANCE 类型（普通文本）
                {
                  type: 'INSTANCE',
                  name: 'Size[a0]=Default,Bordered[a0]=False',
                  children: [
                    {
                      type: 'FRAME',
                      children: [
                        {
                          type: 'TEXT',
                          text: [{ text: '1' }],
                        },
                      ],
                    },
                  ],
                },
                // 列2: INSTANCE 类型（普通文本）
                {
                  type: 'INSTANCE',
                  children: [
                    {
                      type: 'TEXT',
                      text: [{ text: '虚拟电厂名称' }],
                    },
                  ],
                },
                // 列3-5: 类似结构，INSTANCE 类型
                {
                  /* ... */
                },
                // 列6: FRAME 类型（包含标签！）
                {
                  type: 'FRAME', // <-- 注意：外层是 FRAME
                  name: 'Size=Default, Bordered=False',
                  children: [
                    {
                      type: 'INSTANCE', // <-- 标签组件
                      name: 'Preset[aA]=Magenta',
                      componentInfo: {
                        properties: {
                          Preset: 'Magenta', // <-- 关键属性
                        },
                      },
                      children: [
                        {
                          type: 'TEXT',
                          text: [{ text: '充电桩' }],
                        },
                      ],
                    },
                  ],
                },
                // 列7-8: INSTANCE 类型
                {
                  /* ... */
                },
                // 列9: INSTANCE 类型（操作列）
                {
                  type: 'INSTANCE',
                  name: 'Size[a0]=Default,Bordered[a0]=False',
                  // 操作按钮可能为空或包含图标
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * 解析结果验证
 *
 * 必须生成以下9列，顺序完全一致：
 * 1. 序号           → text
 * 2. 名称           → text
 * 3. 编码           → text
 * 4. 社会信用代码   → text
 * 5. 供电单位       → text
 * 6. 资源类型       → tag (Preset: Magenta)
 * 7. 电厂类型       → text
 * 8. 参与市场类型   → text
 * 9. 操作           → action
 */
```

### 解析代码示例

```typescript
/**
 * 虚拟电厂表格解析完整示例
 */
function parseVirtualPowerPlantTable(dslData: any): TableColumn[] {
  const root = dslData.dsl.nodes[0];

  // 找到 DataTableCard
  const dataTableCard = root.children?.find((c: any) => c.name === 'DataTableCard');

  // 找到 Table 结构
  const tableFrame = dataTableCard.children
    ?.find((c: any) => c.name === '*Table*')
    ?.children?.find((c: any) => c.name === 'Table');

  // 提取 Header Row
  const headerRow = tableFrame.children?.find((c: any) => c.name === 'Header Row');
  const headerCells = headerRow.children || [];

  // 提取第一行数据（用于判断内容类型）
  const dataRow = tableFrame.children?.find((c: any) => c.name === 'Row');
  const dataCells = dataRow.children || [];

  // 生成列配置
  return headerCells.map((headerCell: any, index: number) => {
    const headerText = extractTextFromNode(headerCell);
    const dataCell = dataCells[index];

    // 检测内容类型
    let contentType: 'text' | 'tag' | 'action' = 'text';
    let tagConfig = null;

    if (dataCell?.type === 'FRAME') {
      // FRAME 类型可能包含标签
      const hasTag = dataCell.children?.some(
        (c: any) => c.type === 'INSTANCE' && c.componentInfo?.properties?.Preset,
      );
      if (hasTag) {
        contentType = 'tag';
        const tagInstance = dataCell.children?.find((c: any) => c.type === 'INSTANCE');
        const preset = tagInstance?.componentInfo?.properties?.Preset;
        const tagText = extractTextFromNode(tagInstance);
        tagConfig = {
          color: mapPresetToAntdColor(preset),
          text: tagText,
        };
      }
    } else if (headerText === '操作') {
      contentType = 'action';
    }

    return {
      title: headerText,
      dataIndex: `col${index}`,
      key: `col${index}`,
      width: headerCell.layoutStyle?.width,
      contentType,
      tagConfig,
    };
  });
}

// 预期输出：
// [
//   { title: '序号', contentType: 'text' },
//   { title: '名称', contentType: 'text' },
//   { title: '编码', contentType: 'text' },
//   { title: '社会信用代码', contentType: 'text' },
//   { title: '供电单位', contentType: 'text' },
//   { title: '资源类型', contentType: 'tag', tagConfig: { color: 'magenta', text: '充电桩' } },
//   { title: '电厂类型', contentType: 'text' },
//   { title: '参与市场类型', contentType: 'text' },
//   { title: '操作', contentType: 'action' }
// ]
```

### 常见错误与解决方案

```typescript
/**
 * 错误1: 忽略 FRAME 类型的标签单元格
 * 错误代码：
 */
function wrongDetect(cell: Node) {
  if (cell.type === 'INSTANCE') {
    return 'text';  // 只处理了INSTANCE，遗漏了FRAME内的标签
  }
  return 'text';
}

/**
 * 正确代码：检查FRAME内部是否包含标签
 */
function correctDetect(cell: Node) {
  if (cell.type === 'FRAME') {
    const hasTag = cell.children?.some(c =>
      c.type === 'INSTANCE' && c.componentInfo?.properties?.Preset
    );
    if (hasTag) return 'tag';
  }
  if (cell.type === 'INSTANCE') {
    return 'text';
  }
  return 'text';
}

/**
 * 错误2: 使用硬编码列名而非从DSL提取
 * 错误代码：
 */
const columns = [
  { title: '虚拟电厂名称' },  // 硬编码，可能与设计稿不一致
  { title: '虚拟电厂编码' },
  // ...
];

/**
 * 正确代码：从Header Row提取
 */
const headerCells = headerRow.children || [];
const columns = headerCells.map(cell => ({
  title: extractTextFromNode(cell)  // 从DSL动态提取
}));

/**
 * 错误3: 忽略 Preset 属性，使用固定颜色
 * 错误代码：
 */
<a-tag color="success">{{ text }}</a-tag>  // 固定使用success

/**
 * 正确代码：使用 Preset 映射
 */
const preset = tagInstance.componentInfo?.properties?.Preset;
<a-tag :color="mapPresetToAntdColor(preset)">{{ text }}</a-tag>
```
