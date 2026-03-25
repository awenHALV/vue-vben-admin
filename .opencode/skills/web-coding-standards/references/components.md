# 组件使用详解

## 项目封装组件

### Page 页面容器

```vue
<script lang="ts" setup>
import { Page } from '@vben/common-ui';
</script>

<template>
  <Page>
    <template #header>
      <!-- 自定义头部 -->
    </template>
    <!-- 页面内容 -->
  </Page>
</template>
```

### VbenButton 按钮

```vue
<script lang="ts" setup>
import { VbenButton } from '@vben/common-ui';
import { Plus, Edit, Trash2 } from '@vben/icons';
</script>

<template>
  <!-- 主要按钮 -->
  <VbenButton @click="handleAdd">
    <Plus class="mr-1" />
    {{ $t('common.add') }}
  </VbenButton>
  
  <!-- 文本按钮 -->
  <VbenButton text @click="handleEdit">
    <Edit class="mr-1" />
    {{ $t('common.edit') }}
  </VbenButton>
  
  <!-- 危险按钮 -->
  <VbenButton danger @click="handleDelete">
    <Trash2 class="mr-1" />
    {{ $t('common.delete') }}
  </VbenButton>
</template>
```

### VbenInput 输入框

```vue
<script lang="ts" setup>
import { VbenInput } from '@vben/common-ui';
</script>

<template>
  <VbenInput
    v-model:value="searchValue"
    placeholder="请输入..."
    allow-clear
    @search="handleSearch"
  />
</template>
```

## Ant Design Vue 组件

### 导入方式

```ts
// ✅ 推荐：按需导入
import { Button, Form, Input, Modal, message } from 'antdv-next';
import type { FormInstance } from 'antdv-next';
```

### Form 表单

```vue
<script lang="ts" setup>
import { Form, FormItem, Input, Select, Button } from 'antdv-next';
import type { FormInstance } from 'antdv-next';

const formRef = ref<FormInstance>(null);
const formData = ref({
  name: '',
  age: '',
  status: '1',
});

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 1, max: 150, message: '年龄范围 1-150', trigger: 'blur' },
  ],
};

async function handleSubmit() {
  try {
    const values = await formRef.value?.validate();
    // 提交逻辑
  } catch (error) {
    // 验证失败
  }
}
</script>

<template>
  <Form ref="formRef" :model="formData" :rules="rules" layout="vertical">
    <FormItem label="名称" name="name">
      <Input v-model:value="formData.name" placeholder="请输入名称" />
    </FormItem>
    
    <FormItem label="年龄" name="age">
      <Input v-model:value="formData.age" type="number" placeholder="请输入年龄" />
    </FormItem>
    
    <FormItem label="状态" name="status">
      <Select v-model:value="formData.status" placeholder="请选择状态">
        <Select.Option value="1">正常</Select.Option>
        <Select.Option value="0">禁用</Select.Option>
      </Select>
    </FormItem>
    
    <FormItem>
      <Space>
        <Button type="primary" @click="handleSubmit">提交</Button>
        <Button @click="handleReset">重置</Button>
      </Space>
    </FormItem>
  </Form>
</template>
```

### Modal 弹窗

```vue
<script lang="ts" setup>
import { Modal, Button, Form, FormItem, Input } from 'antdv-next';
import type { FormInstance } from 'antdv-next';

interface Props {
  visible?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '',
});

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const formRef = ref<FormInstance>(null);
const formData = ref({});

function handleClose() {
  emit('close');
}

async function handleSubmit() {
  try {
    const values = await formRef.value?.validate();
    await saveApi(values);
    message.success('保存成功');
    emit('saved');
  } catch {
    // 验证失败
  }
}
</script>

<template>
  <Modal
    :open="visible"
    :title="title"
    width="600px"
    @close="handleClose"
  >
    <Form ref="formRef" :model="formData" layout="vertical">
      <FormItem label="名称" name="name" :rules="[{ required: true }]">
        <Input v-model:value="formData.name" />
      </FormItem>
    </Form>
    
    <template #footer>
      <Button @click="handleClose">{{ $t('common.cancel') }}</Button>
      <Button type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</Button>
    </template>
  </Modal>
</template>
```

### Table 表格

```vue
<script lang="ts" setup>
import { Table, Button, Space, Tag } from 'antdv-next';

const columns = [
  {
    title: '序号',
    dataIndex: 'index',
    width: 60,
    align: 'center',
  },
  {
    title: '名称',
    dataIndex: 'name',
    minWidth: 120,
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    customRender: ({ record }: any) => {
      const color = record.status === 1 ? 'green' : 'red';
      const text = record.status === 1 ? '正常' : '禁用';
      return <Tag color={color}>{text}</Tag>;
    },
  },
  {
    title: '操作',
    width: 200,
    fixed: 'right',
    align: 'center',
    customRender: ({ record }: any) => {
      return (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      );
    },
  },
];

const tableData = ref([]);
</script>

<template>
  <Table
    :columns="columns"
    :data-source="tableData"
    :loading="loading"
    :pagination="pagination"
    row-key="id"
    @change="handleTableChange"
  />
</template>
```

## Vxe Table 使用

### 标准配置

```vue
<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

const [Grid, gridApi] = useVbenVxeGrid<UserInfo>({
  showSearchForm: false,
  gridOptions: {
    height: 'auto',
    rowConfig: { isHover: true },
    proxyConfig: {
      ajax: {
        query: async (proxyParams: any) => {
          const params = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
            ...searchForm,
          };
          const res = await getUserPageApi(params);
          return {
            records: res?.records || [],
            total: res?.total || 0,
          };
        },
      },
      response: {
        result: 'records',
        total: 'total',
        list: 'records',
      },
    },
    columns: [
      {
        type: 'seq',
        title: $t('common.seq'),
        width: 60,
      },
      {
        field: 'account',
        title: $t('system.user.account'),
        minWidth: 120,
      },
      {
        field: 'name',
        title: $t('system.user.name'),
        minWidth: 100,
      },
      {
        field: 'status',
        title: $t('system.common.status'),
        width: 80,
        formatter: ({ cellValue }: any) => {
          return cellValue === 1 ? $t('system.common.normal') : $t('system.common.disabled');
        },
      },
      {
        title: $t('common.operation'),
        width: 200,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});
</script>

<template>
  <Grid>
    <template #action="{ row }">
      <Button type="link" @click="handleEdit(row)">
        {{ $t('common.edit') }}
      </Button>
      <Button type="link" danger @click="handleDelete(row)">
        {{ $t('common.delete') }}
      </Button>
    </template>
  </Grid>
</template>
```

## 树形组件

### Tree 树控件

```vue
<script lang="ts" setup>
import { computed, ref } from 'vue';
import { Tree, InputSearch, Card } from 'antdv-next';
import type { TreeProps } from 'antdv-next';

interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

const searchKey = ref('');
const deptTreeData = ref<TreeNode[]>([]);
const selectedKeys = ref<string[]>([]);

// 过滤树
const filteredDeptTree = computed(() => {
  if (!searchKey.value) return deptTreeData.value;
  return filterTree(deptTreeData.value, searchKey.value.toLowerCase());
});

function filterTree(data: TreeNode[], keyword: string): TreeNode[] {
  const result: TreeNode[] = [];
  for (const item of data) {
    if (item.name.toLowerCase().includes(keyword)) {
      result.push({ ...item });
    } else if (item.children?.length) {
      const filteredChildren = filterTree(item.children, keyword);
      if (filteredChildren.length) {
        result.push({ ...item, children: filteredChildren });
      }
    }
  }
  return result;
}

function onSelect(keys: string[]) {
  selectedKeys.value = keys;
}
</script>

<template>
  <Card :bordered="false">
    <InputSearch v-model:value="searchKey" class="mb-2" placeholder="搜索..." />
    <Tree
      :data="filteredDeptTree"
      :selected-keys="selectedKeys"
      :field-names="{ children: 'children', title: 'name', key: 'id' }"
      @select="onSelect"
    />
  </Card>
</template>
```

## 注意事项

### 1. 导入顺序

```ts
// ✅ 正确
import type { UserInfo } from '#/api/system/user';
import { computed, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { $t } from '#/locales';
import { Button, Modal } from 'antdv-next';
import { getUserApi } from '#/api/system/user';
import UserForm from './components/UserForm.vue';

// ❌ 错误：顺序混乱
import { Button } from 'antdv-next';
import type { UserInfo } from '#/api/system/user';
import { ref } from 'vue';
```

### 2. 组件命名

```ts
// ✅ 推荐：语义化命名
const formVisible = ref(false);
const formType = ref<'add' | 'edit'>('add');
const formData = ref<Partial<UserInfo>>({});

// ❌ 避免：模糊命名
const visible = ref(false);
const type = ref('');
const data = ref({});
```

### 3. 错误处理

```ts
// ✅ 推荐：统一错误处理
try {
  await deleteUserApi(id);
  message.success($t('common.deleteSuccess'));
  fetchData(); // 刷新列表
} catch (error) {
  // 错误已在拦截器处理
}

// ❌ 避免：重复处理错误
try {
  await deleteUserApi(id);
  message.success('删除成功');
} catch (error) {
  message.error('删除失败');
}
```
