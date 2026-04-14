<script lang="ts" setup>
import type { BackendMenuItem, ResourcePoolItem } from '#/api/core/menu';
import type { DictOption } from '#/api/system/dict';
import type { RoleInfo } from '#/api/system/role';

import { computed, nextTick, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Checkbox,
  Col,
  Empty,
  message,
  Modal,
  Radio,
  Row,
  Spin,
  Tabs,
  Tree,
} from 'antdv-next';

import { getMineFeaturesRawApi, getResourcePoolListApi } from '#/api/core/menu';
import { getDictOptionsApi } from '#/api/system/dict';
import {
  getDataSourceApi,
  getRolePermissionApi,
  saveDataSourceApi,
  saveRolePermissionApi,
} from '#/api/system/role';
import { $t } from '#/locales';

// ==================== Props & Emits ====================

interface Props {
  visible?: boolean;
  data?: Partial<RoleInfo>;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  data: () => ({}),
});

const emit = defineEmits<{
  success: [];
  'update:visible': [value: boolean];
}>();

// ==================== 状态定义 ====================

const activeTab = ref('func');
/** 递增以强制重挂载 Tree，避免勾选状态与 v-model 不同步 */
const permissionTreeKey = ref(0);
/** 数据权限表格区域 key，合并回显后刷新 Radio */
const dataScopePanelKey = ref(0);
const loading = ref(false);
const okLoading = ref(false);

const rawData = ref<BackendMenuItem[]>([]);
const selectedMenuId = ref<null | number | string>(null);
const checkedKeysSet = ref<Set<number | string>>(new Set());

// ==================== 数据资源权限相关 ====================
const resourcePool = ref<ResourcePoolItem[]>([]);
const dataScopeOptions = ref<DictOption[]>([]);
const selectedDataScopes = ref<Record<string, string>>({}); // resourceCode -> scopeValue（与字典 optionKey 一致）

/** 将接口返回的 dataScope 规范为字典 optionKey，否则 Radio 无法选中 */
function normalizeDataScopeToOptionKey(
  raw: string | undefined,
  options: DictOption[],
): string {
  if (raw === undefined || raw === null) {
    return '';
  }
  const s = String(raw).trim();
  if (!s) {
    return '';
  }
  const byKey = options.find((o) => o.optionKey === s);
  if (byKey) {
    return byKey.optionKey;
  }
  const byVal = options.find((o) => o.optionValue === s);
  if (byVal) {
    return byVal.optionKey;
  }
  const byValEn = options.find((o) => o.optionValueEn === s);
  if (byValEn) {
    return byValEn.optionKey;
  }
  return s;
}

function pickDefaultDataScopeKey(): string {
  const opts = dataScopeOptions.value;
  const selfOption =
    opts.find(
      (opt) =>
        opt.optionValue === '本人' ||
        opt.optionKey === 'SELF' ||
        opt.optionKey === '1',
    ) || opts[0];
  return selfOption?.optionKey ?? '';
}

// 获取已勾选的功能项所涉及的所有资源编码
const checkedResourceCodes = computed(() => {
  const codes = new Set<string>();
  checkedKeysSet.value.forEach((id) => {
    const node = allNodesMap.value.get(id);
    if (node?.resourceCode) {
      // 处理逗号分隔的多个资源编码
      node.resourceCode.split(',').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) {
          codes.add(trimmed);
        }
      });
    }
  });
  return codes;
});

// 计算当前应展示的数据资源列表（resourceCode 与勾选树中的编码统一 trim，避免接口/资源池空格导致对不上）
const activeDataResources = computed(() => {
  return resourcePool.value
    .map((item) => ({
      ...item,
      resourceCode: String(item.resourceCode ?? '').trim(),
    }))
    .filter((item) => {
      return (
        item.resourceCode && checkedResourceCodes.value.has(item.resourceCode)
      );
    });
});

// 监听活动资源变化：新勾选的资源补默认值（已存在的键不覆盖，保留接口回显）
watch(
  activeDataResources,
  (newResources) => {
    let changed = false;
    const next = { ...selectedDataScopes.value };
    newResources.forEach((res) => {
      if (!(res.resourceCode in next)) {
        const def = pickDefaultDataScopeKey();
        if (def) {
          next[res.resourceCode] = def;
          changed = true;
        }
      }
    });
    if (changed) {
      selectedDataScopes.value = next;
    }
  },
  { immediate: true },
);

function onDataScopeChange(resourceCode: string, value: string) {
  selectedDataScopes.value = {
    ...selectedDataScopes.value,
    [resourceCode]: value,
  };
}

// ==================== 数据转换与计算 ====================

/** 从角色权限接口解析功能 id 列表（兼容字段名与逗号分隔/数组） */
function extractFeatureIdStrings(perm: unknown): string[] {
  if (perm === undefined || perm === null || typeof perm !== 'object') {
    return [];
  }
  const p = perm as Record<string, unknown>;
  const raw = p.featureIds ?? p.featuresId ?? p.feature_id ?? p.features_ids;
  if (raw === undefined || raw === null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  const s = String(raw).trim();
  if (!s) {
    return [];
  }
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildNodesMapFromTree(items: BackendMenuItem[]) {
  const map = new Map<number | string, BackendMenuItem>();
  const traverse = (list: BackendMenuItem[]) => {
    for (const item of list) {
      map.set(item.id, item);
      if (item.children?.length) {
        traverse(item.children);
      }
    }
  };
  traverse(items);
  return map;
}

/** 将接口下发的 id 转为树节点上的「真实 id」（与 treeData key 一致，解决 number/string 不一致导致不勾选） */
function resolveCheckedIdsFromPermission(
  permKeys: string[],
  nodesMap: Map<number | string, BackendMenuItem>,
): Set<number | string> {
  const lookup = new Map<string, number | string>();
  for (const id of nodesMap.keys()) {
    lookup.set(String(id), id);
  }
  const set = new Set<number | string>();
  for (const raw of permKeys) {
    const t = String(raw).trim();
    if (!t) {
      continue;
    }
    const canon = lookup.get(t);
    if (canon !== undefined) {
      set.add(canon);
    }
  }
  return set;
}

/** 若接口只下发叶子/按钮 id，补全父级菜单勾选以便树与接口语义一致 */
function expandCheckedWithAncestors(
  ids: Set<number | string>,
  nodesMap: Map<number | string, BackendMenuItem>,
): Set<number | string> {
  const out = new Set(ids);
  for (const id of ids) {
    let node = nodesMap.get(id);
    while (
      node !== undefined &&
      node.parentId !== null &&
      node.parentId !== undefined &&
      nodesMap.has(node.parentId)
    ) {
      const pid = node.parentId;
      out.add(pid);
      node = nodesMap.get(pid)!;
    }
  }
  return out;
}

type DataSourceRow = {
  dataScope?: string;
  resourceCode?: string;
  resourceId?: number | string;
  resourceName?: string;
};

/** 数据权限列表：兼容直接数组或分页 records/list */
function normalizeDataSourceList(raw: unknown): DataSourceRow[] {
  if (Array.isArray(raw)) {
    return raw as DataSourceRow[];
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.records)) {
      return o.records as DataSourceRow[];
    }
    if (Array.isArray(o.list)) {
      return o.list as DataSourceRow[];
    }
  }
  return [];
}

// 将所有节点平铺，方便查询
const allNodesMap = computed(() => {
  const map = new Map<number | string, BackendMenuItem>();
  const traverse = (items: BackendMenuItem[]) => {
    items.forEach((item) => {
      map.set(item.id, item);
      if (item.children) {
        traverse(item.children);
      }
    });
  };
  traverse(rawData.value);
  return map;
});

// 过滤树，只显示 MENU 类型
const menuTreeData = computed(() => {
  const filterMenu = (items: BackendMenuItem[]): any[] => {
    return items
      .filter((item) => item.featureType === 'MENU')
      .map((item) => ({
        ...item,
        key: item.id,
        title: item.featureName,
        children: item.children ? filterMenu(item.children) : [],
      }));
  };
  return filterMenu(rawData.value);
});

// 获取某一节点下所有的按钮节点（递归）
const getAllButtonsInSubtree = (node: BackendMenuItem): BackendMenuItem[] => {
  let buttons: BackendMenuItem[] = [];
  if (node.children) {
    node.children.forEach((child) => {
      if (child.featureType === 'BUTTON') {
        buttons.push(child);
      }
      buttons = [...buttons, ...getAllButtonsInSubtree(child)];
    });
  }
  return buttons;
};

// 获取某一节点下所有的功能节点（递归，包含 MENU 和 BUTTON）
const getAllFeaturesInSubtree = (
  node: BackendMenuItem,
): (number | string)[] => {
  let ids: (number | string)[] = [node.id];
  if (node.children) {
    node.children.forEach((child) => {
      ids = [...ids, ...getAllFeaturesInSubtree(child)];
    });
  }
  return ids;
};

// 计算节点的按钮统计信息
const getButtonCountInfo = (node: BackendMenuItem) => {
  const buttons = getAllButtonsInSubtree(node);
  const total = buttons.length;
  const selected = buttons.filter((b) => checkedKeysSet.value.has(b.id)).length;
  return { selected, total };
};

// 当前选中的菜单节点下递归展示的所有按钮
const currentButtons = computed(() => {
  if (!selectedMenuId.value) return [];
  const node = allNodesMap.value.get(selectedMenuId.value);
  if (!node) return [];

  // 只有点击叶子节点（没有子菜单的菜单节点）才展示按钮
  const hasChildMenu = node.children?.some((c) => c.featureType === 'MENU');
  if (hasChildMenu) return [];

  return getAllButtonsInSubtree(node);
});

// 判断当前选中的节点是否为父级菜单（含有子菜单）
const selectedNodeHasChildMenu = computed(() => {
  if (!selectedMenuId.value) return false;
  const node = allNodesMap.value.get(selectedMenuId.value);
  return !!node?.children?.some((c) => c.featureType === 'MENU');
});

// 当前展示的所有按钮 ID
const currentAllButtonIds = computed(() => {
  return currentButtons.value.map((b) => b.id);
});

// 右侧“全选”状态
const isAllButtonsChecked = computed(() => {
  if (currentAllButtonIds.value.length === 0) return false;
  return currentAllButtonIds.value.every((id) => checkedKeysSet.value.has(id));
});

const isSomeButtonsChecked = computed(() => {
  if (currentAllButtonIds.value.length === 0) return false;
  return (
    !isAllButtonsChecked.value &&
    currentAllButtonIds.value.some((id) => checkedKeysSet.value.has(id))
  );
});

// ==================== 事件处理 ====================

const loadData = async () => {
  try {
    loading.value = true;
    const roleId = props.data?.id || '';
    const [featureRes, permRes, poolRes, dictRes, dataSourceRows] =
      await Promise.all([
        getMineFeaturesRawApi(),
        getRolePermissionApi(roleId),
        getResourcePoolListApi(),
        getDictOptionsApi('sys_data_scope'),
        getDataSourceApi(roleId),
      ]);

    rawData.value = Array.isArray(featureRes) ? featureRes : [];
    resourcePool.value = poolRes || [];
    dataScopeOptions.value = dictRes || [];

    const nodesMap = buildNodesMapFromTree(rawData.value);
    const permKeys = extractFeatureIdStrings(permRes);
    let checked = resolveCheckedIdsFromPermission(permKeys, nodesMap);
    checked = expandCheckedWithAncestors(checked, nodesMap);
    checkedKeysSet.value = new Set(checked);
    permissionTreeKey.value += 1;

    await nextTick();

    const dictOpts = dictRes || [];
    const rows = normalizeDataSourceList(dataSourceRows);
    const scopeFromApi: Record<string, string> = {};
    for (const row of rows) {
      const code = row.resourceCode?.trim();
      if (code) {
        scopeFromApi[code] = normalizeDataScopeToOptionKey(
          row.dataScope,
          dictOpts,
        );
      }
    }

    const merged: Record<string, string> = { ...scopeFromApi };
    for (const res of activeDataResources.value) {
      const code = res.resourceCode;
      if (!code) {
        continue;
      }
      if (!(code in merged)) {
        const def = pickDefaultDataScopeKey();
        if (def) {
          merged[code] = def;
        }
      }
    }
    selectedDataScopes.value = merged;
    dataScopePanelKey.value += 1;

    // 默认展开第一个
    const firstMenu = rawData.value[0];
    if (firstMenu) {
      selectedMenuId.value = firstMenu.id;
    }
  } catch (error) {
    console.error('加载权限数据失败:', error);
  } finally {
    loading.value = false;
  }
};

/** 向上递归：如果父节点的所有子节点都未勾选，则取消勾选父节点 */
const syncParentUncheck = (node: BackendMenuItem) => {
  let current = node;
  while (current.parentId && allNodesMap.value.has(current.parentId)) {
    const parent = allNodesMap.value.get(current.parentId)!;
    // 检查该父节点下是否还有任意一个子节点被勾选（包含 MENU 和 BUTTON）
    const hasAnyChildChecked = parent.children?.some((child) =>
      checkedKeysSet.value.has(child.id),
    );
    if (hasAnyChildChecked) {
      break; // 还有其他子节点被勾选，停止向上清理
    } else {
      checkedKeysSet.value.delete(parent.id);
      current = parent;
    }
  }
};

const handleMenuCheck = (
  _checkedKeys: any,
  info: { checked: boolean; node: any },
) => {
  const id = info.node.id;
  const node = allNodesMap.value.get(id);
  if (!node) return;

  const allIds = getAllFeaturesInSubtree(node);
  if (info.checked) {
    allIds.forEach((i) => checkedKeysSet.value.add(i));
    // 向上勾选父节点
    let current = node;
    while (current.parentId && allNodesMap.value.has(current.parentId)) {
      checkedKeysSet.value.add(current.parentId);
      current = allNodesMap.value.get(current.parentId)!;
    }
  } else {
    allIds.forEach((i) => checkedKeysSet.value.delete(i));
    // 向上同步取消勾选
    syncParentUncheck(node);
  }
  // 强制触发响应式更新
  checkedKeysSet.value = new Set(checkedKeysSet.value);
};

const handleButtonCheck = (id: number | string, checked: boolean) => {
  if (checked) {
    checkedKeysSet.value.add(id);
    // 勾选按钮时，确保父菜单也被勾选
    const node = allNodesMap.value.get(id);
    let current = node;
    while (current?.parentId && allNodesMap.value.has(current.parentId)) {
      checkedKeysSet.value.add(current.parentId);
      current = allNodesMap.value.get(current.parentId);
    }
  } else {
    checkedKeysSet.value.delete(id);
    const node = allNodesMap.value.get(id);
    if (node) {
      syncParentUncheck(node);
    }
  }
  // 强制触发响应式更新
  checkedKeysSet.value = new Set(checkedKeysSet.value);
};

const handleSelectAllButtons = (e: any) => {
  const checked = e.target.checked;
  currentAllButtonIds.value.forEach((id) => {
    if (checked) {
      handleButtonCheck(id, true);
    } else {
      checkedKeysSet.value.delete(id);
    }
  });
  // 强制触发响应式更新
  checkedKeysSet.value = new Set(checkedKeysSet.value);
};

const handleSelectNode = (selectedKeys: any[]) => {
  if (selectedKeys.length > 0) {
    selectedMenuId.value = selectedKeys[0];
  }
};

const handleOk = async () => {
  try {
    okLoading.value = true;
    const roleId = props.data?.id || '';
    const featureIds = [...checkedKeysSet.value].join(',');

    // 保存菜单和按钮
    await saveRolePermissionApi({
      featureIds,
      roleId,
    });

    const dataScopes = activeDataResources.value.map((res) => ({
      dataScope: selectedDataScopes.value[res.resourceCode] ?? '',
      resourceCode: res.resourceCode,
      resourceId: res.id,
    }));
    // 保存数据资源权限
    await saveDataSourceApi({
      resources: dataScopes,
      roleId,
    });

    message.success($t('ui.actionMessage.operationSuccess'));
    emit('success');
    handleClose();
  } catch (error: any) {
    console.error(error);
    // message.error(error?.message || '保存失败');
  } finally {
    okLoading.value = false;
  }
};

const handleClose = () => {
  emit('update:visible', false);
  checkedKeysSet.value = new Set();
  rawData.value = [];
  selectedMenuId.value = null;
  selectedDataScopes.value = {};
  activeTab.value = 'func';
  permissionTreeKey.value = 0;
  dataScopePanelKey.value = 0;
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadData();
    }
  },
);
</script>

<template>
  <Modal
    :open="visible"
    :title="$t('system.role.permissionConfig', '权限管理')"
    :width="1000"
    :confirm-loading="okLoading"
    :body-style="{ padding: '0 24px 24px 24px' }"
    @ok="handleOk"
    @cancel="handleClose"
  >
    <Tabs v-model:active-key="activeTab" class="permission-tabs">
      <Tabs.TabPane
        key="func"
        :tab="$t('system.role.funcPermission', '功能菜单配置')"
      >
        <Spin :spinning="loading">
          <div
            class="permission-container flex h-[500px] overflow-hidden border border-gray-200"
            style="
              border-color: #e4e4e7;
              border-top-left-radius: 6px;
              border-top-right-radius: 6px;
            "
          >
            <!-- 左侧：功能菜单树 -->
            <div class="flex h-full w-2/5 flex-col">
              <div
                class="permission-table-header permission-table-header--left shrink-0 px-4 py-3 text-sm font-medium text-foreground"
              >
                {{ $t('system.role.funcMenu', '功能菜单') }}
              </div>
              <div
                class="min-h-0 flex-1 overflow-auto border-r border-[#e4e4e7] p-4"
              >
                <Tree
                  :key="`role-perm-tree-${permissionTreeKey}`"
                  :checked-keys="[...checkedKeysSet]"
                  :selected-keys="selectedMenuId ? [selectedMenuId] : []"
                  :tree-data="menuTreeData"
                  checkable
                  block-node
                  :check-strictly="true"
                  @check="handleMenuCheck"
                  @select="handleSelectNode"
                >
                  <template #title="node">
                    <div class="flex flex-1 items-center justify-between pr-2">
                      <span class="flex items-center gap-1">
                        <IconifyIcon
                          v-if="node.children && node.children.length > 0"
                          icon="lucide:folder"
                          class="text-primary"
                        />
                        <IconifyIcon
                          v-else
                          icon="lucide:file-text"
                          class="text-gray-400"
                        />
                        {{ node.title }}
                      </span>
                      <span
                        v-if="getButtonCountInfo(node).total > 0"
                        class="text-xs text-gray-400"
                      >
                        {{ getButtonCountInfo(node).selected }}/{{
                          getButtonCountInfo(node).total
                        }}
                      </span>
                    </div>
                  </template>
                </Tree>
              </div>
            </div>

            <!-- 右侧：按钮权限（表头样式与左侧功能菜单一致） -->
            <div class="flex h-full w-3/5 flex-col">
              <div
                class="permission-table-header permission-table-header--right flex shrink-0 items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
              >
                <span>
                  {{ $t('system.role.buttonPermission', '按钮权限') }}
                </span>
                <Checkbox
                  class="permission-select-all-checkbox"
                  :checked="isAllButtonsChecked"
                  :indeterminate="isSomeButtonsChecked"
                  @change="handleSelectAllButtons"
                >
                  {{ $t('system.common.selectAll', '全选') }}
                </Checkbox>
              </div>
              <div class="flex min-h-0 flex-1 flex-col bg-gray-50/30">
                <div
                  v-if="currentButtons.length > 0"
                  class="min-h-0 flex-1 overflow-auto p-4"
                >
                  <Row :gutter="[16, 16]">
                    <!-- prettier-ignore -->
                    <Col
                      v-for="btn in currentButtons"
                      :key="btn.id"
                      :span="6"
                    >
                      <Checkbox
                        :checked="checkedKeysSet.has(btn.id)"
                        class="w-full truncate"
                        @change="
                          (e: any) =>
                            handleButtonCheck(btn.id, e.target.checked)
                        "
                      >
                        <span :title="btn.featureName">
                          {{ btn.featureName }}
                        </span>
                      </Checkbox>
                    </Col>
                  </Row>
                </div>
                <div v-else class="flex-center flex flex-1 p-4">
                  <Empty
                    :description="
                      selectedNodeHasChildMenu
                        ? $t(
                            'system.role.selectLeafMenu',
                            '请选择叶子菜单进行按钮配置',
                          )
                        : $t('system.role.noButtons', '此菜单下暂无按钮权限')
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </Spin>
      </Tabs.TabPane>

      <Tabs.TabPane
        key="data"
        :tab="$t('system.role.dataPermission', '数据资源权限配置')"
      >
        <div class="h-[500px] animate-in flex-col fade-in">
          <div
            v-if="activeDataResources.length > 0"
            :key="`data-scope-panel-${dataScopePanelKey}`"
            class="h-full overflow-auto"
          >
            <!-- <div class="mb-4 text-sm text-gray-400">
              {{ $t('system.role.dataResourceHint') }}
            </div> -->
            <div
              class="data-scope-panel-box overflow-hidden border border-gray-200"
            >
              <table class="w-full border-collapse">
                <thead
                  class="bg-gray-50 text-left text-sm font-medium text-foreground"
                >
                  <tr>
                    <th class="w-1/4 border-b border-gray-200 px-4 py-3">
                      {{ $t('system.role.dataResourceName') }}
                    </th>
                    <th class="border-b border-gray-200 px-4 py-3">
                      {{ $t('system.role.dataScopeConfig') }}
                    </th>
                  </tr>
                </thead>
                <tbody class="text-sm text-gray-600">
                  <tr
                    v-for="res in activeDataResources"
                    :key="res.resourceCode"
                    class="transition-colors hover:bg-gray-50/50"
                  >
                    <td
                      class="border-b border-gray-100 p-4 font-medium text-gray-700"
                    >
                      {{ res.resourceName }}
                    </td>
                    <td class="border-b border-gray-100 p-4">
                      <Radio.Group
                        :value="selectedDataScopes[res.resourceCode]"
                        @update:value="
                          onDataScopeChange(res.resourceCode, $event)
                        "
                      >
                        <Radio
                          v-for="opt in dataScopeOptions"
                          :key="opt.optionKey"
                          :value="opt.optionKey"
                          class="mr-4"
                        >
                          {{ opt.optionValue }}
                        </Radio>
                      </Radio.Group>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else class="flex-col-center h-full">
            <Empty
              :description="
                checkedKeysSet.size === 0
                  ? $t(
                      'system.role.chooseFeatureFirst',
                      '请先在权限管理下勾选菜单',
                    )
                  : $t(
                      'system.role.noAssociatedResources',
                      '已选菜单未关联任何数据资源',
                    )
              "
            />
          </div>
        </div>
      </Tabs.TabPane>
    </Tabs>
  </Modal>
</template>

<style scoped>
.permission-table-header {
  border-style: solid;
  border-color: #e4e4e7;
  background: rgba(0, 0, 0, 0.02);
}

.permission-table-header--left {
  border-width: 0 1px 1px 0;
  border-top-left-radius: 1px;
}

/* 与左侧同背景与底边线；右侧无外列竖线，避免与容器右边框重叠为双边框 */
.permission-table-header--right {
  border-width: 0 0 1px 0;
  border-top-right-radius: 1px;
}

/* 全选：标签区高度 20px */
.permission-select-all-checkbox {
  display: inline-flex;
  align-items: center;
  height: 20px;
  line-height: 20px;
}

/* 数据资源权限表格外框：仅右上角 1px 圆角 */
.data-scope-panel-box {
  border-color: #e4e4e7;
  border-top-right-radius: 6px;
  border-top-left-radius: 6px;
}

.permission-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.permission-container :deep(.ant-tree) {
  background: transparent;
}

.permission-container :deep(.ant-tree-node-content-wrapper) {
  display: flex !important;
}

/* 自定义滚动条样式 */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #e4e4e7;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: transparent;
}
</style>
