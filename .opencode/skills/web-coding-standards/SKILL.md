---
name: web-coding-standards
description: Vben Admin 项目前端开发规范。基于 Vue 3 + TypeScript + Ant Design Vue + Vxe Table。用于代码审查、规范检查、生成符合项目约定的代码，支持国际化配置文件自动生成。
---

# Web 前端编码规范

## 项目技术栈

- **框架**: Vue 3.5+ (Composition API + `<script setup>`)
- **语言**: TypeScript 5+
- **构建**: Vite 6+
- **UI 库**: Ant Design Vue 4+ (`antdv-next`)
- **表格**: Vxe Table 4+
- **样式**: TailwindCSS 4+ + Shadcn Vue
- **状态管理**: Pinia
- **路由**: Vue Router 4+
- **国际化**: vue-i18n (`$t`)

## 核心原则 ⭐

### 1. 组件使用优先级

**必须严格遵守以下优先级顺序：**

```
第一优先级：@vben/common-ui 封装组件    >>> 最高优先级
第二优先级：#/adapter 适配器组件       >>> 次高优先级  
第三优先级：antdv-next 原生组件        >>> 仅在以上都没有时使用
```

**示例：**

```ts
// ✅ 正确：优先使用项目封装
import { Page, VbenButton } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { $t } from '#/locales';

// ✅ 正确：封装组件没有时使用 antdv-next
import { Button, Form, Input, message, Modal } from 'antdv-next';

// ❌ 错误：跳过封装组件直接使用 antdv-next
import { Page } from 'antdv-next'; // 应该使用 @vben/common-ui
```

### 2. 作者标识 (必须)

**所有 AI 生成的代码必须在文件顶部添加作者注释**

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
```

```ts
/**
 * @author inspur-iep-ai
 */
```

## 国际化配置文件自动生成

### 1. 国际化文件结构

项目国际化文件位于 `apps/web-antdv-next/src/locales/langs/` 目录：

```
locales/
├── langs/
│   ├── zh-CN/
│   │   ├── system.json    # 系统管理模块（用户、组织、角色等）
│   │   ├── page.json      # 页面级模块（业务页面）
│   │   ├── app.json       # 应用级配置
│   │   └── demos.json     # 示例模块
│   └── en-US/
│       ├── system.json
│       ├── page.json
│       ├── app.json
│       └── demos.json
```

**文件说明：**
- `system.json`: 系统管理相关（user、org、role 等）
- `page.json`: 独立业务页面（如 powerPlant、dashboard 等）
- `app.json`: 应用通用配置
- `demos.json`: 示例/演示模块

### 2. 新增模块时自动生成国际化文件

**当创建新页面/模块时，必须同时更新国际化文件。**

**步骤：**

1. **确定模块分类**：
   - 系统管理相关（用户、组织、角色） → `system.json`
   - 独立业务页面（虚拟电厂、仪表盘） → `page.json`
   - 示例/演示 → `demos.json`
   - 应用通用配置 → `app.json`

2. **手动编辑 JSON 文件**：

编辑 `apps/web-antdv-next/src/locales/langs/zh-CN/page.json` 和 `en-US/page.json`：

```json
{
  "powerPlant": {
    "title": "虚拟电厂档案",
    "list": "虚拟电厂列表",
    "detail": "虚拟电厂详情",
    "add": "新增虚拟电厂",
    "edit": "编辑虚拟电厂",
    "delete": "删除虚拟电厂",
    "save": "保存虚拟电厂",
    "deleteConfirm": "是否确认删除该虚拟电厂？",
    "saveSuccess": "保存成功",
    "deleteSuccess": "删除成功",
    "searchPlaceholder": "请输入虚拟电厂名称",
    "name": "虚拟电厂名称",
    "namePlaceholder": "请输入虚拟电厂名称",
    "nameRequired": "虚拟电厂名称不能为空",
    "code": "虚拟电厂编码",
    "codePlaceholder": "请输入虚拟电厂编码",
    "codeRequired": "虚拟电厂编码不能为空",
    "entCode": "社会信用代码",
    "entCodePlaceholder": "请输入社会信用代码",
    "entCodeRequired": "社会信用代码不能为空",
    "powerSupplyUnit": "供电单位",
    "powerSupplyUnitPlaceholder": "请输入供电单位",
    "includingResourceType": "包含资源类型",
    "powerPlantType": "电厂类型",
    "powerPlantTypePlaceholder": "请输入电厂类型",
    "marketType": "参与市场类型",
    "marketTypePlaceholder": "请输入参与市场类型"
  }
}
```

3. **系统管理模块示例**（system.json）：

```json
{
  "common": {
    "search": "查询",
    "reset": "重置",
    "add": "新增",
    "edit": "编辑",
    "delete": "删除",
    "view": "查看",
    "cancel": "取消",
    "ok": "确定",
    "operation": "操作",
    "pleaseInput": "请输入",
    "pleaseSelect": "请选择",
    "selectPlaceholder": "请选择",
    "confirmDelete": "是否确认删除选中数据？",
    "deleteSuccess": "删除成功",
    "deleteFailed": "删除失败",
    "addSuccess": "新增成功",
    "editSuccess": "编辑成功",
    "cannotBeNull": "不能为空",
    "status": "用户状态",
    "normal": "正常",
    "disabled": "禁用",
    "enable": "启用",
    "remarks": "备注",
    "sort": "排序",
    "createTime": "创建时间",
    "updateTime": "更新时间"
  },
  "user": {
    "title": "用户管理",
    "account": "登录账号",
    "name": "用户姓名",
    "phone": "用户手机号",
    "email": "用户邮箱",
    "role": "角色",
    "org": "组织",
    "password": "密码",
    "confirmPassword": "确认密码"
  },
  "org": {
    "title": "组织管理",
    "orgName": "组织名称",
    "parentOrg": "上级组织",
    "orgAttribute": "组织属性",
    "orgCode": "组织编码"
  },
  "role": {
    "title": "角色管理",
    "roleName": "角色名称",
    "roleCode": "角色编码",
    "organization": "所属组织",
    "permission": "功能权限"
  }
}
```

### 3. 国际化键名规范

**核心原则：使用 `{文件名}.{module}.{xxx}` 三级结构**

国际化文件以 `system.json` 为例，使用时应该遵循 `{文件名}.{module}.{xxx}` 的格式：

```ts
// ✅ 正确格式：{文件名}.{module}.{xxx}
$ t('system.common.add')          // system.json 中的 common.add
$ t('system.user.title')          // system.json 中的 user.title
$ t('system.user.name')           // system.json 中的 user.name
$ t('system.org.title')           // system.json 中的 org.title
$ t('system.role.roleName')       // system.json 中的 role.roleName

// ✅ 页面级：page.json 也遵循同样规则
$ t('page.powerPlant.title')      // page.json 中的 powerPlant.title
$ t('page.dashboard.analytics')   // page.json 中的 dashboard.analytics

// ❌ 错误：缺少文件名前缀
$ t('common.add')                 // 缺少 'system.' 前缀
$ t('user.title')                 // 缺少 'system.' 前缀
$ t('powerPlant.title')           // 缺少 'page.' 前缀
```

**通用键名（system.json/common）：**
```ts
system.common.add          // 新增
system.common.edit         // 编辑
system.common.delete       // 删除
system.common.save         // 保存
system.common.cancel       // 取消
system.common.confirm      // 确定
system.common.operation    // 操作  
system.common.status       // 状态  
system.common.normal       // 正常
system.common.disabled     // 禁用
system.common.search       // 查询
system.common.reset        // 重置
system.common.view         // 查看
system.common.remarks      // 备注
system.common.sort         // 排序
system.common.createTime   // 创建时间
system.common.updateTime   // 更新时间
```

**模块键名（遵循 {文件名}.{module}.{xxx} 格式）：**
```ts
// system.json 中的模块
system.user.title          // 用户管理
system.user.account        // 登录账号
system.user.name           // 用户姓名
system.user.phone          // 用户手机号
system.user.email          // 用户邮箱
system.user.role           // 角色
system.user.org            // 组织
system.user.password       // 密码

system.org.title           // 组织管理
system.org.orgName         // 组织名称
system.org.parentOrg       // 上级组织
system.org.orgCode         // 组织编码

system.role.title          // 角色管理
system.role.roleName       // 角色名称
system.role.roleCode       // 角色编码
system.role.organization   // 所属组织
system.role.permission     // 功能权限

// page.json 中的模块
page.powerPlant.title      // 虚拟电厂档案
page.powerPlant.list       // 虚拟电厂列表
page.powerPlant.detail     // 虚拟电厂详情
page.powerPlant.add        // 新增虚拟电厂
page.powerPlant.edit       // 编辑虚拟电厂
page.powerPlant.delete     // 删除虚拟电厂
page.powerPlant.save       // 保存虚拟电厂
page.powerPlant.deleteConfirm // 删除确认提示
page.powerPlant.saveSuccess   // 保存成功提示
page.powerPlant.deleteSuccess // 删除成功提示
page.powerPlant.searchPlaceholder // 搜索框占位符
page.powerPlant.name       // 虚拟电厂名称
page.powerPlant.code       // 虚拟电厂编码
page.powerPlant.entCode    // 社会信用代码
page.powerPlant.powerSupplyUnit    // 供电单位
page.powerPlant.includingResourceType // 包含资源类型
page.powerPlant.powerPlantType      // 电厂类型
page.powerPlant.marketType          // 参与市场类型
```

**字段级键名（{文件名}.{module}.{field}+ 后缀）：**
```ts
// 字段名
system.user.name           // 用户姓名
system.user.phone          // 用户手机号

// 输入框占位符：{文件名}.{module}.{field}Placeholder
system.user.namePlaceholder     // 请输入用户姓名
system.user.phonePlaceholder    // 请输入手机号

// 必填验证提示：{文件名}.{module}.{field}Required
system.user.nameRequired        // 用户姓名不能为空
system.user.phoneRequired       // 手机号不能为空

// 页面级字段示例
page.powerPlant.namePlaceholder     // 请输入虚拟电厂名称
page.powerPlant.nameRequired        // 虚拟电厂名称不能为空
page.powerPlant.codePlaceholder     // 请输入虚拟电厂编码
page.powerPlant.codeRequired        // 虚拟电厂编码不能为空
```

### 6. 使用示例

```vue
<script lang="ts" setup>
import { $t } from '#/locales';

// ✅ 正确：system.json 使用 {文件名}.{module}.{xxx} 格式
// 页面标题
const userTitle = $t('system.user.title');
const orgTitle = $t('system.org.title');
const roleTitle = $t('system.role.title');

// 表单标签
const nameLabel = $t('system.user.name');
const phoneLabel = $t('system.user.phone');
const emailLabel = $t('system.user.email');

// 占位符
const namePlaceholder = $t('system.user.namePlaceholder');
const phonePlaceholder = $t('system.user.phonePlaceholder');

// 通用键名
const addLabel = $t('system.common.add');
const editLabel = $t('system.common.edit');
const deleteLabel = $t('system.common.delete');

// ✅ 正确：page.json 也使用 {文件名}.{module}.{xxx} 格式
const powerPlantTitle = $t('page.powerPlant.title');
const powerPlantName = $t('page.powerPlant.name');
const powerPlantCode = $t('page.powerPlant.code');

// 页面级占位符和验证提示
const namePlaceholder2 = $t('page.powerPlant.namePlaceholder');
const nameRequired = $t('page.powerPlant.nameRequired');
const codePlaceholder = $t('page.powerPlant.codePlaceholder');
const codeRequired = $t('page.powerPlant.codeRequired');
</script>

<template>
  <!-- system.json 使用示例 -->
  <Page :title="$t('system.user.title')">
    <Input 
      v-model:value="searchForm.name" 
      :placeholder="$t('system.user.namePlaceholder')" 
    />
    <Button @click="handleAdd">
      {{ $t('system.common.add') }}
    </Button>
  </Page>

  <!-- page.json 使用示例 -->
  <Page :title="$t('page.powerPlant.title')">
    <Input 
      v-model:value="searchForm.name" 
      :placeholder="$t('page.powerPlant.namePlaceholder')" 
    />
    <Button type="primary" @click="handleAdd">
      {{ $t('page.powerPlant.add') }}
    </Button>
  </Page>
</template>
```

### 5. 使用要点总结

1. **必须遵循 `{文件名}.{module}.{xxx}` 格式**
   - system.json → `system.common.add`, `system.user.title`
   - page.json → `page.powerPlant.title`, `page.dashboard.analytics`

2. **配置和使用时都要加文件名前缀**
   - 配置：JSON 中的键不带文件名（如 `"user": { "title": "用户管理" }`）
   - 使用：`$t` 函数中必须带文件名（如 `$t('system.user.title')`）

3. **常见错误示例**
   ```ts
   // ❌ 错误：缺少文件名前缀
   $t('user.title')              // 应该是 system.user.title
   $t('powerPlant.name')         // 应该是 page.powerPlant.name
   $t('common.add')              // 应该是 system.common.add
   
   // ✅ 正确
   $t('system.user.title')
   $t('page.powerPlant.name')
   $t('system.common.add')
   ```

**英文配置** (`en-US/system.json`):

```json
{
  "common": {
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "OK"
  },
  "user": {
    "title": "User Management",
    "name": "Name",
    "namePlaceholder": "Enter name",
    "nameRequired": "Name is required",
    "phone": "Phone",
    "phonePlaceholder": "Enter phone number",
    "phoneRequired": "Phone number is required"
  },
  "org": {
    "title": "Organization Management",
    "orgName": "Organization Name",
    "parentOrg": "Parent Organization"
  },
  "role": {
    "title": "Role Management",
    "roleName": "Role Name",
    "roleCode": "Role Code"
  }
}
```

**中文配置** (`zh-CN/page.json`):

```json
{
  "powerPlant": {
    "title": "虚拟电厂档案",
    "name": "虚拟电厂名称",
    "namePlaceholder": "请输入虚拟电厂名称",
    "nameRequired": "虚拟电厂名称不能为空",
    "code": "虚拟电厂编码",
    "codePlaceholder": "请输入虚拟电厂编码",
    "codeRequired": "虚拟电厂编码不能为空",
    "add": "新增虚拟电厂",
    "edit": "编辑虚拟电厂",
    "delete": "删除虚拟电厂",
    "saveSuccess": "保存成功",
    "deleteSuccess": "删除成功",
    "deleteConfirm": "是否确认删除该虚拟电厂？"
  }
}
```

**英文配置** (`en-US/page.json`):

```json
{
  "powerPlant": {
    "title": "Virtual Power Plant",
    "name": "Plant Name",
    "namePlaceholder": "Enter plant name",
    "nameRequired": "Plant name is required",
    "code": "Plant Code",
    "codePlaceholder": "Enter plant code",
    "codeRequired": "Plant code is required",
    "add": "Add Power Plant",
    "edit": "Edit Power Plant",
    "delete": "Delete Power Plant",
    "saveSuccess": "Save successful",
    "deleteSuccess": "Delete successful",
    "deleteConfirm": "Are you sure you want to delete this power plant?"
  }
}
```

## 代码规范

### 1. Script Setup 结构顺序

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
// 1. 类型导入 (#/api 路径)
import type { UserInfo } from '#/api/system/user';

// 2. Vue 核心导入
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

// 3. 通用组件导入 (@vben 开头) ⭐ 优先级最高
import { Page, VbenButton } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import { useUserStore } from '@vben/stores';

// 4. UI 库导入 (antdv-next) ⭐ 仅在封装组件没有时使用
import { Button, Form, Input, message, Modal, Table } from 'antdv-next';

// 5. 工具/适配器导入 ⭐ 优先使用封装的 Hook
import { useVbenVxeGrid } from '#/adapter/vxe-table';

// 6. API 导入
import { getUserPageApi, deleteUserApi } from '#/api/system/user';

// 7. 子组件导入
import UserForm from './components/UserForm.vue';

// 8. defineOptions (仅页面组件需要)
defineOptions({ name: 'SystemUser' });

// ==================== 状态定义 ====================

// 9. 响应式状态 (按功能分组)
const loading = ref(false);
const selectedKeys = ref<string[]>([]);

// 10. 表单状态
const searchForm = reactive({
  name: '',
  account: '',
});

// 11. 弹窗状态
const formVisible = ref(false);
const formType = ref<'add' | 'edit'>('add');
const formData = ref<Partial<UserInfo>>({});

// ==================== Computed 属性 ====================

const filteredData = computed(() => {
  // 计算逻辑
});

// ==================== VxeGrid 配置 (如使用) ====================

const [Grid, gridApi] = useVbenVxeGrid<UserInfo>({
  showSearchForm: false,
  gridOptions: {
    // 配置项
  },
});

// ==================== 方法 ====================

// 12. 数据加载函数
async function fetchData() {
  loading.value = true;
  try {
    // API 调用
  } finally {
    loading.value = false;
  }
}

// 13. 事件处理函数 (handleXxx)
function handleAdd() {}
function handleEdit(record: UserInfo) {}
function handleDelete(record: UserInfo) {}

// 14. 表单提交函数
async function handleSubmit() {}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchData();
});
</script>
```

### 2. 类型定义规范

- 类型导入使用 `#/api/模块` 路径
- 类型命名：`XxxInfo` (实体), `XxxParams` (参数), `XxxResponse` (响应)
- 使用 `Partial<T>` 处理表单数据
- 使用 `ref<T>()` 或 `ref<T | null>()` 明确类型

```ts
import type { UserInfo, UserParams } from '#/api/system/user';

const userList = ref<UserInfo[]>([]);
const formData = ref<Partial<UserInfo>>({});
const selectedRecord = ref<UserInfo | null>(null);
```

### 3. API 调用规范

- API 文件位于 `src/api/模块/` 目录
- 使用 `#` 路径别名
- 函数命名：`getXxxApi`, `createXxxApi`, `updateXxxApi`, `deleteXxxApi`, `getXxxPageApi`
- 统一返回格式：`{ code, data, message }`

```ts
import { getUserPageApi, deleteUserApi } from '#/api/system/user';

// 分页查询
const res = await getUserPageApi({
  current: 1,
  size: 10,
  ...searchForm,
});

// 错误处理
try {
  await deleteUserApi(id);
  message.success($t('common.deleteSuccess'));
} catch (error) {
  // 错误已在拦截器处理
}
```

## 页面组件模式

### 2. CRUD 页面标准结构

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';

import { onMounted, reactive, ref } from 'vue';

// ⭐ 优先使用项目封装组件
import { Page } from '@vben/common-ui';
import { $t } from '#/locales';

// ⭐ 封装组件没有时才使用 antdv-next
import { Button, message, Modal, Table } from 'antdv-next';

import { getUserPageApi, deleteUserApi } from '#/api/system/user';
import UserForm from './components/UserForm.vue';

defineOptions({ name: 'SystemUser' });

// 状态
const loading = ref(false);
const tableData = ref<UserInfo[]>([]);
const formVisible = ref(false);
const formType = ref<'add' | 'edit'>('add');
const formData = ref<Partial<UserInfo>>({});

// VxeGrid 或 Table
const [Grid, gridApi] = useVbenVxeGrid({ /* 配置 */ });

// 方法
async function fetchData() { /* 加载数据 */ }
function handleAdd() { /* 新增 */ }
function handleEdit(record: UserInfo) { /* 编辑 */ }
async function handleDelete(record: UserInfo) { /* 删除 */ }

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page>
    <!-- 页面内容 -->
  </Page>
</template>
```

### 2. 左侧树 + 右侧表格模式

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { $t } from '#/locales';

import { Button, Card, Form, Input, Space, Tree } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getDeptTreeApi, getUserPageApi } from '#/api/system/user';

// 左侧树
const selectedDeptId = ref<string>('');
const deptTreeData = ref<DeptTreeNode[]>([]);
const searchKey = ref('');

// 右侧表格
const [Grid, gridApi] = useVbenVxeGrid({ /* 配置 */ });

// 过滤树
const filteredDeptTree = computed(() => {
  if (!searchKey.value) return deptTreeData.value;
  return filterTree(deptTreeData.value, searchKey.value.toLowerCase());
});

async function loadDeptTree() {
  deptTreeData.value = await getDeptTreeApi();
}

onMounted(() => {
  loadDeptTree();
});
</script>

<template>
  <Page>
    <div class="flex h-full gap-4">
      <!-- 左侧树 -->
      <Card class="w-64 flex-shrink-0" :bordered="false">
        <InputSearch v-model="searchKey" class="mb-2" />
        <Tree
          :data="filteredDeptTree"
          :selected-keys="selectedKeys"
          @select="onSelectDept"
        />
      </Card>

      <!-- 右侧内容 -->
      <div class="flex-1 overflow-hidden">
        <Grid />
      </div>
    </div>
  </Page>
</template>
```

### 3. 表单弹窗组件模式

```vue
<!-- @author inspur-iep-ai -->
<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';

import { computed, nextTick, ref, watch } from 'vue';

import { $t } from '#/locales';

import { Button, Form, FormItem, Input, Modal } from 'antdv-next';
import type { FormInstance } from 'antdv-next';

import { createOrUpdateUserApi } from '#/api/system/user';

interface Props {
  visible?: boolean;
  data?: Partial<UserInfo>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  data: () => ({}),
});

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const formRef = ref<FormInstance>(null);
const formData = ref<Partial<UserInfo>>({});

const modalTitle = computed(() => {
  return formData.value.id ? $t('common.edit') : $t('common.add');
});

watch(
  () => props.visible,
  async (val) => {
    if (val && props.data?.id) {
      formData.value = { ...props.data };
    } else {
      formData.value = {};
    }
    await nextTick();
    formRef.value?.clearValidate();
  },
);

function handleClose() {
  emit('close');
}

async function handleSubmit() {
  try {
    const values = await formRef.value?.validate();
    await createOrUpdateUserApi(values);
    message.success($t('common.saveSuccess'));
    emit('saved');
  } catch {
    // 验证失败
  }
}
</script>

<template>
  <Modal
    :open="visible"
    :title="modalTitle"
    width="500px"
    @close="handleClose"
  >
    <Form ref="formRef" :model="formData" layout="vertical">
      <FormItem
        :label="$t('system.user.name')"
        name="name"
        :rules="[{ required: true }]"
      >
        <Input v-model:value="formData.name" :placeholder="$t('system.user.name')" />
      </FormItem>
    </Form>

    <template #footer>
      <Button @click="handleClose">{{ $t('common.cancel') }}</Button>
      <Button type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</Button>
    </template>
  </Modal>
</template>
```

## 组件使用规范

### 1. 优先使用项目封装组件 ⭐⭐⭐

```ts
// ✅ 推荐：使用项目封装（最高优先级）
import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { VbenButton, VbenInput } from '@vben/common-ui';

// ✅ 推荐：封装组件没有时使用 antdv-next
import { Button, Form, Input, message, Modal, Table } from 'antdv-next';

// ❌ 避免：直接使用 ant-design-vue（不是 antdv-next）
import { Button } from 'ant-design-vue';
```

### 2. 常用封装组件清单

| 组件 | 导入路径 | 说明 |
|------|---------|------|
| Page | `@vben/common-ui` | 页面容器 ⭐ |
| VbenButton | `@vben/common-ui` | 按钮 ⭐ |
| VbenInput | `@vben/common-ui` | 输入框 ⭐ |
| useVbenVxeGrid | `#/adapter/vxe-table` | 表格 Hook ⭐ |
| VbenForm | `@vben/common-ui` | 表单 ⭐ |
| VbenModal | `@vben/common-ui` | 弹窗 ⭐ |
| VbenDrawer | `@vben/common-ui` | 抽屉 ⭐ |
| IconifyIcon | `@vben/icons` | 图标 ⭐ |
| $t | `#/locales` | 国际化 ⭐ |
| Button | `antdv-next` | 按钮（封装没有时） |
| Form | `antdv-next` | 表单（封装没有时） |
| Input | `antdv-next` | 输入框（封装没有时） |
| Modal | `antdv-next` | 弹窗（封装没有时） |
| Table | `antdv-next` | 表格（封装没有时） |

### 3. VxeGrid 标准配置

```ts
import { useVbenVxeGrid } from '#/adapter/vxe-table';

const [Grid, gridApi] = useVbenVxeGrid<UserInfo>({
  showSearchForm: false,
  separator: false,
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
      { type: 'seq', title: $t('common.seq'), width: 60 },
      { field: 'name', title: $t('system.user.name'), minWidth: 100 },
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
```

## TailwindCSS 工具类规范

### 1. 常用布局类

```vue
<template>
  <!-- 水平居中 -->
  <div class="flex items-center justify-center">
  
  <!-- 垂直布局 -->
  <div class="flex flex-col gap-4">
  
  <!-- 左右布局 -->
  <div class="flex justify-between items-center">
  
  <!-- 响应式隐藏 -->
  <div class="hidden md:block lg:flex">
  
  <!-- 间距 -->
  <div class="p-4 m-2 gap-2 space-y-4">
  
  <!-- 尺寸 -->
  <div class="w-full h-full min-h-screen max-w-7xl">
  
  <!-- 定位 -->
  <div class="relative absolute fixed inset-0">
  
  <!-- 层级 -->
  <div class="z-10 z-50">
  
  <!-- 文本 -->
  <div class="text-sm text-gray-500 text-center truncate">
</template>
```

### 2. 页面布局模板

```vue
<template>
  <!-- 标准页面 -->
  <Page>
    <div class="flex h-full gap-4">
      <!-- 左侧边栏 -->
      <div class="w-64 flex-shrink-0">
        <!-- 内容 -->
      </div>
      
      <!-- 主内容区 -->
      <div class="flex-1 overflow-hidden">
        <!-- 内容 -->
      </div>
    </div>
  </Page>
</template>
```

## 国际化规范

### 1. 使用 `$t` 函数

```ts
import { $t } from '#/locales';

// ✅ 正确：遵循 {文件名}.{module}.{xxx} 格式
// system.json 使用
const userTitle = $t('system.user.title');
const userName = $t('system.user.name');
const commonAdd = $t('system.common.add');

// page.json 使用
const powerPlantTitle = $t('page.powerPlant.title');
const powerPlantName = $t('page.powerPlant.name');

// ❌ 错误：缺少文件名前缀
const wrongTitle = $t('user.title');         // 缺少 'system.'
const wrongName = $t('powerPlant.name');     // 缺少 'page.'

// 组件内使用
const formLabel = $t('system.user.name');

// 模板内使用
<template>
  <div>{{ $t('system.user.name') }}</div>
  <Input :placeholder="$t('system.user.namePlaceholder')" />
</template>
```

### 2. 键名规范

**核心原则：所有国际化键名必须遵循 `{文件名}.{module}.{xxx}` 三级结构**

**通用键名** (system.json/common):
- `system.common.add`, `system.common.edit`, `system.common.delete`, `system.common.save`, `system.common.cancel`
- `system.common.operation`, `system.common.status`, `system.common.normal`, `system.common.disabled`
- `system.common.search`, `system.common.reset`, `system.common.view`, `system.common.remarks`
- `system.common.createTime`, `system.common.updateTime`

**页面级键名** (page.json):
- `page.powerPlant.title`, `page.powerPlant.name`, `page.powerPlant.code`
- `page.dashboard.title`, `page.dashboard.analytics`, `page.dashboard.workspace`

**系统管理键名** (system.json):
- `system.user.title`, `system.user.account`, `system.user.name`
- `system.org.title`, `system.org.orgName`, `system.org.parentOrg`
- `system.role.title`, `system.role.roleName`, `system.role.roleCode`

### 3. 新增模块时的国际化配置 ⭐

**当创建新模块（如虚拟电厂）时，必须同时配置国际化文件，遵循 {文件名}.{module}.{xxx} 格式：**

1. 编辑 `apps/web-antdv-next/src/locales/langs/zh-CN/page.json`:

```json
{
  "powerPlant": {
    "title": "虚拟电厂档案",
    "list": "虚拟电厂列表",
    "detail": "虚拟电厂详情",
    "add": "新增虚拟电厂",
    "edit": "编辑虚拟电厂",
    "delete": "删除虚拟电厂",
    "save": "保存虚拟电厂",
    "deleteConfirm": "是否确认删除该虚拟电厂？",
    "saveSuccess": "保存成功",
    "deleteSuccess": "删除成功",
    "searchPlaceholder": "请输入虚拟电厂名称",
    "name": "虚拟电厂名称",
    "namePlaceholder": "请输入虚拟电厂名称",
    "nameRequired": "虚拟电厂名称不能为空",
    "code": "虚拟电厂编码",
    "codePlaceholder": "请输入虚拟电厂编码",
    "codeRequired": "虚拟电厂编码不能为空",
    "entCode": "社会信用代码",
    "entCodePlaceholder": "请输入社会信用代码",
    "entCodeRequired": "社会信用代码不能为空",
    "powerSupplyUnit": "供电单位",
    "powerSupplyUnitPlaceholder": "请输入供电单位",
    "includingResourceType": "包含资源类型",
    "powerPlantType": "电厂类型",
    "powerPlantTypePlaceholder": "请输入电厂类型",
    "marketType": "参与市场类型",
    "marketTypePlaceholder": "请输入参与市场类型"
  }
}
```

2. 编辑 `apps/web-antdv-next/src/locales/langs/en-US/page.json`:

```json
{
  "powerPlant": {
    "title": "Virtual Power Plant",
    "list": "Power Plant List",
    "detail": "Power Plant Details",
    "add": "Add Power Plant",
    "edit": "Edit Power Plant",
    "delete": "Delete Power Plant",
    "save": "Save Power Plant",
    "deleteConfirm": "Are you sure you want to delete this power plant?",
    "saveSuccess": "Save successful",
    "deleteSuccess": "Delete successful",
    "searchPlaceholder": "Enter power plant name",
    "name": "Plant Name",
    "namePlaceholder": "Enter plant name",
    "nameRequired": "Plant name is required",
    "code": "Plant Code",
    "codePlaceholder": "Enter plant code",
    "codeRequired": "Plant code is required",
    "entCode": "Social Credit Code",
    "entCodePlaceholder": "Enter social credit code",
    "entCodeRequired": "Social credit code is required",
    "powerSupplyUnit": "Power Supply Unit",
    "powerSupplyUnitPlaceholder": "Enter power supply unit",
    "includingResourceType": "Resource Type",
    "powerPlantType": "Plant Type",
    "powerPlantTypePlaceholder": "Enter plant type",
    "marketType": "Market Type",
    "marketTypePlaceholder": "Enter market type"
  }
}
```

3. 在组件中使用（**注意：使用时也必须加文件名前缀**）：

```ts
import { $t } from '#/locales';

// ✅ 正确：使用 page.powerPlant.xxx 格式
<Page :title="$t('page.powerPlant.title')">
  <Input :placeholder="$t('page.powerPlant.namePlaceholder')" />
  <Button @click="handleAdd">{{ $t('page.powerPlant.add') }}</Button>
  <Button @click="handleDelete">{{ $t('page.powerPlant.delete') }}</Button>
</Page>

// ✅ 正确：system.json 也使用 system.xxx 格式
<Page :title="$t('system.user.title')">
  <Input :placeholder="$t('system.user.namePlaceholder')" />
  <Button @click="handleAdd">{{ $t('system.common.add') }}</Button>
</Page>

// ❌ 错误：缺少文件名前缀
<Page :title="$t('powerPlant.title')">  // 缺少 'page.'
<Input :placeholder="$t('user.name')">  // 缺少 'system.'
```

### 4. 完整示例

**中文配置** (`zh-CN/system.json`):

```json
{
  "common": {
    "search": "查询",
    "reset": "重置",
    "add": "新增",
    "edit": "编辑",
    "delete": "删除",
    "view": "查看",
    "cancel": "取消",
    "ok": "确定",
    "operation": "操作",
    "pleaseInput": "请输入",
    "pleaseSelect": "请选择",
    "selectPlaceholder": "请选择",
    "confirmDelete": "是否确认删除选中数据？",
    "deleteSuccess": "删除成功",
    "deleteFailed": "删除失败",
    "addSuccess": "新增成功",
    "editSuccess": "编辑成功",
    "cannotBeNull": "不能为空",
    "status": "用户状态",
    "normal": "正常",
    "disabled": "禁用",
    "enable": "启用",
    "remarks": "备注",
    "sort": "排序",
    "createTime": "创建时间",
    "updateTime": "更新时间"
  },
  "user": {
    "title": "用户管理",
    "account": "登录账号",
    "name": "用户姓名",
    "phone": "用户手机号",
    "email": "用户邮箱",
    "role": "角色",
    "org": "组织",
    "password": "密码",
    "confirmPassword": "确认密码",
    "batchImport": "批量导入",
    "editPassword": "修改密码",
    "userDetails": "用户详情",
    "addUser": "新增用户",
    "editUser": "编辑用户"
  },
  "org": {
    "title": "组织管理",
    "orgName": "组织名称",
    "parentOrg": "上级组织",
    "orgAttribute": "组织属性",
    "orgCode": "组织编码",
    "addSubitem": "新增子项",
    "addOrg": "新增组织",
    "editOrg": "编辑组织"
  },
  "role": {
    "title": "角色管理",
    "roleName": "角色名称",
    "roleCode": "角色编码",
    "organization": "所属组织",
    "permission": "功能权限",
    "addRole": "新增角色",
    "editRole": "编辑角色",
    "permissionConfig": "菜单权限"
  }
}
```

**英文配置** (`en-US/system.json`):

```json
{
  "common": {
    "search": "Search",
    "reset": "Reset",
    "add": "Add",
    "edit": "Edit",
    "delete": "Delete",
    "view": "View",
    "cancel": "Cancel",
    "ok": "OK",
    "operation": "Operation",
    "pleaseInput": "Please enter",
    "pleaseSelect": "Please select",
    "selectPlaceholder": "Please select",
    "confirmDelete": "Are you sure you want to delete the selected data?",
    "deleteSuccess": "Deleted successfully",
    "deleteFailed": "Delete failed",
    "addSuccess": "Added successfully",
    "editSuccess": "Edited successfully",
    "cannotBeNull": "cannot be null",
    "status": "User Status",
    "normal": "Normal",
    "disabled": "Disabled",
    "enable": "Enable",
    "remarks": "Remarks",
    "sort": "Sort",
    "createTime": "Create Time",
    "updateTime": "Update Time"
  },
  "user": {
    "title": "User Management",
    "account": "Log Account",
    "name": "User Name",
    "phone": "User Phone",
    "email": "User Email",
    "role": "Role",
    "org": "Org",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "batchImport": "Batch Import",
    "editPassword": "Edit Password",
    "userDetails": "User Details",
    "addUser": "Add User",
    "editUser": "Edit User"
  },
  "org": {
    "title": "Organization Management",
    "orgName": "Organization Name",
    "parentOrg": "Parent Organization",
    "orgAttribute": "Organization Attribute",
    "orgCode": "Organization Code",
    "addSubitem": "Add Subitem",
    "addOrg": "Add Organization",
    "editOrg": "Edit Organization"
  },
  "role": {
    "title": "Role Management",
    "roleName": "Role Name",
    "roleCode": "Role Code",
    "organization": "Organization",
    "permission": "Menu Permission",
    "addRole": "Add Role",
    "editRole": "Edit Role",
    "permissionConfig": "Function Permission"
  }
}
```

## 命名规范

### 1. 文件/目录

- 页面：`index.vue`, `AddOrUpdate.vue`, `XxxDetail.vue`
- 组件：`XxxForm.vue`, `XxxModal.vue`, `XxxTable.vue`
- API：`user.ts`, `role.ts`, `menu.ts`, `powerPlant.ts`
- 目录：小写复数 `system/`, `user/`, `components/`

### 2. 变量/函数

```ts
// 响应式
const loading = ref(false);
const tableData = ref<UserInfo[]>([]);
const formVisible = ref(false);

// 计算属性
const filteredData = computed(() => {});

// 方法
async function fetchData() {}
function handleAdd() {}
function handleEdit(record: UserInfo) {}
function handleSubmit() {}
function handleClose() {}

// 事件处理
const onSelect = (record: UserInfo) => {};
```

## 代码检查命令

```bash
# 格式化
pnpm format

# ESLint 检查
pnpm lint

# 类型检查
pnpm typecheck

# 提交
pnpm commit
```

## 新增模块完整流程

当需要创建新模块（如虚拟电厂管理）时，遵循以下流程：

### 步骤 1：创建 API 文件

`src/api/powerPlant.ts` - 定义类型和 API 方法

### 步骤 2：创建页面组件

`src/views/power-plant/index.vue` - 页面主组件

### 步骤 3：创建路由配置

`src/router/routes/modules/power-plant.ts` - 路由模块

### 步骤 4：配置国际化 ⭐

编辑 `apps/web-antdv-next/src/locales/langs/zh-CN/page.json` 和 `en-US/page.json`，添加模块对应的翻译

**示例：**

```json
// zh-CN/page.json
{
  "powerPlant": {
    "title": "虚拟电厂档案",
    "name": "虚拟电厂名称",
    "code": "虚拟电厂编码",
    "add": "新增虚拟电厂",
    "edit": "编辑虚拟电厂",
    "delete": "删除虚拟电厂"
  }
}

// en-US/page.json
{
  "powerPlant": {
    "title": "Virtual Power Plant",
    "name": "Plant Name",
    "code": "Plant Code",
    "add": "Add Power Plant",
    "edit": "Edit Power Plant",
    "delete": "Delete Power Plant"
  }
}
```

### 步骤 5：验证

运行 `pnpm typecheck` 确保类型正确

## 参考资料

- **组件使用详解**：`references/components.md` - 项目封装组件清单和使用方法
- **页面模板集合**：`references/templates.md` - 常用页面模板代码
- **国际化配置**：本文档"国际化配置文件自动生成"章节 ⭐
- **项目文档**：https://doc.vben.pro/
