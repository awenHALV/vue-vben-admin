<script lang="ts" setup>
import type { BackendTenantItem, TenantPageParams } from '#/api/core/tenant';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, VbenButton, VbenInput } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { setCookie, TOKEN_KEY } from '@vben/utils';

import { Button, message, Modal, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getTenantAuthCodeApi,
  getTenantPageApi,
  switchTenantApi,
} from '#/api/core/tenant';
import { usePageButtonAccess } from '#/composables/use-page-button-access';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';
import { useAuthStore } from '#/store';

import AddOrUpdate from './AddOrUpdate.vue';
import { TENANT_PAGE_BUTTON_CODES } from './button-permissions';
import TenantDetail from './TenantDetail.vue';
import TenantMenuConfig from './TenantMenuConfig.vue';

defineOptions({ name: 'TenantManagement' });

const router = useRouter();
const accessStore = useAccessStore();
const userStore = useUserStore();
const authStore = useAuthStore();
const { canButton } = usePageButtonAccess();

interface AccessMenuItem {
  children?: AccessMenuItem[];
  path?: string;
}

function getFirstMenuPath(menus: AccessMenuItem[]): string {
  for (const menu of menus) {
    const children = menu.children ?? [];
    if (children.length > 0) {
      const childPath = getFirstMenuPath(children);
      if (childPath) {
        return childPath;
      }
    }
    const path = menu.path ?? '';
    if (path && !path.startsWith('http')) {
      return path;
    }
  }
  return '';
}

function hasMenuPath(menus: AccessMenuItem[], targetPath: string): boolean {
  for (const menu of menus) {
    if (menu.path === targetPath) {
      return true;
    }
    const children = menu.children ?? [];
    if (children.length > 0 && hasMenuPath(children, targetPath)) {
      return true;
    }
  }
  return false;
}

function extractTokenFromSwitchPayload(data: unknown): string | undefined {
  if (typeof data === 'string') {
    return data;
  }
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.token === 'string') {
      return d.token;
    }
    if (typeof d.accessToken === 'string') {
      return d.accessToken;
    }
  }
  return undefined;
}

const addOrUpdateRef = ref<InstanceType<typeof AddOrUpdate> | null>(null);
const tenantDetailRef = ref<InstanceType<typeof TenantDetail> | null>(null);
const tenantMenuConfigRef = ref<InstanceType<typeof TenantMenuConfig> | null>(
  null,
);

/** 与菜单管理页一致的搜索条，条件通过 reload 传给 proxy */
const searchTenantName = ref('');
const searchTenantCode = ref('');

const statusLabel = computed(() => ({
  true: $t('tenant.status.enabled'),
  false: $t('tenant.status.disabled'),
}));

const [Grid, gridApi] = useVbenVxeGrid<BackendTenantItem>({
  /** 使用与菜单管理一致的自定义搜索区（见模板） */
  showSearchForm: false,
  separator: false,
  gridClass: 'p-6 pt-4',
  gridOptions: {
    maxHeight: '100%',
    rowConfig: { isHover: true, height: 46 },
    checkboxConfig: {
      highlight: true,
      range: true,
      // 树节点勾选互不级联—
      checkStrictly: true,
    },
    proxyConfig: {
      ajax: {
        /**
         * Vben 对 query 做了包装：第一个参数为 vxe 的 proxy 参数（含 page），
         * 第二个参数为 `reload(传入对象)` 与内置搜索表单 `getLatestSubmissionValues()` 的合并结果。
         * 本页自定义搜索区通过 `gridApi.reload(getSearchPayload())` 传参，必须在第二参数里合并。
         */
        query: async (proxyParams: any, mergedForm: any) => {
          const params: TenantPageParams = {
            current: proxyParams?.page?.currentPage,
            size: proxyParams?.page?.pageSize,
          };
          if (mergedForm && typeof mergedForm === 'object') {
            Object.assign(params, mergedForm);
          }
          return await getTenantPageApi(params);
        },
      },
    },
    columns: [
      {
        field: 'tenantId',
        title: $t('tenant.list.tenantId'),
        minWidth: 180,
      },
      {
        field: 'tenantName',
        title: $t('tenant.list.tenantName'),
        minWidth: 180,
      },
      {
        field: 'companyName',
        title: $t('tenant.list.companyName'),
        minWidth: 100,
      },
      {
        field: 'creditCode',
        title: $t('tenant.list.creditCode'),
        minWidth: 100,
      },
      {
        field: 'adminAccount',
        title: $t('tenant.list.adminAccount'),
        minWidth: 100,
      },
      {
        field: 'adminName',
        title: $t('tenant.list.adminName'),
        minWidth: 100,
      },
      {
        field: 'adminPhone',
        title: $t('tenant.list.adminPhone'),
        minWidth: 100,
      },
      {
        field: 'status',
        title: $t('tenant.list.status'),
        width: 110,
        align: 'center',
        formatter: ({ cellValue }: any) => {
          const enabled = Boolean(cellValue ?? true);
          return enabled ? statusLabel.value.true : statusLabel.value.false;
        },
      },
      {
        title: $t('tenant.list.action'),
        width: 280,
        fixed: 'right',
        align: 'center',
        slots: { default: 'action' },
      },
    ],
  },
});

function getSearchPayload(): Partial<TenantPageParams> {
  const tenantName = searchTenantName.value.trim();
  const tenantCode = searchTenantCode.value.trim();
  const payload: Partial<TenantPageParams> = {};
  if (tenantName) {
    payload.tenantName = tenantName;
  }
  if (tenantCode) {
    payload.tenantCode = tenantCode;
  }
  return payload;
}

async function reloadTenantGrid() {
  await gridApi.reload(getSearchPayload());
}

function handleSearch() {
  void reloadTenantGrid();
}

function handleReset() {
  searchTenantName.value = '';
  searchTenantCode.value = '';
  void reloadTenantGrid();
}

function openAdd() {
  addOrUpdateRef.value?.open();
}

function openEdit(record: BackendTenantItem) {
  addOrUpdateRef.value?.open(record);
}

function openDetail(record: BackendTenantItem) {
  tenantDetailRef.value?.open(record);
}

function openMenu(record: BackendTenantItem) {
  tenantMenuConfigRef.value?.open(record);
}

const switchingTenant = ref(false);

async function applyTenantTokenAndRefresh(token: string) {
  accessStore.setAccessToken(token);
  setCookie(TOKEN_KEY, token);
  if (accessStore.loginExpired) {
    accessStore.setLoginExpired(false);
  }
  await authStore.fetchUserInfo();
  const userRoles = userStore.userInfo?.roles ?? [];
  const { accessibleMenus, accessibleRoutes } = await generateAccess({
    roles: userRoles,
    router,
    routes: accessRoutes,
  });
  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(accessibleRoutes);
  accessStore.setIsAccessChecked(true);

  const currentPath = router.currentRoute.value.path;
  if (!hasMenuPath(accessibleMenus as AccessMenuItem[], currentPath)) {
    const firstMenuPath = getFirstMenuPath(accessibleMenus as AccessMenuItem[]);
    const fallbackPath =
      firstMenuPath ||
      userStore.userInfo?.homePath ||
      preferences.app.defaultHomePath;
    if (fallbackPath && fallbackPath !== currentPath) {
      await router.replace(fallbackPath);
    }
  }
}

/**
 * 切换租户流程
 * 1）拉授权码 → 2）调切换接口 → 3）从返回里取 token（支持 token / accessToken 或整段为字符串）
4）setAccessToken + setCookie(TOKEN_KEY)
5）fetchUserInfo()
6）generateAccess 刷新菜单与动态路由并写回 accessStore
7）若当前路由在新菜单里不存在，则跳到首个可访问菜单或首页。
 * @param record
 */
async function runSwitchTenant(record: BackendTenantItem) {
  const tenantPk = record.id ?? record.tenantId;
  if (tenantPk === undefined || tenantPk === null) {
    message.error($t('tenant.message.switchTenantMissingId'));
    return;
  }
  switchingTenant.value = true;
  try {
    const authPayload = await getTenantAuthCodeApi(tenantPk);
    const raw = authPayload as { authCode?: string; code?: string };
    let authCode: string | undefined;
    if (typeof raw?.code === 'string') {
      authCode = raw.code;
    } else if (typeof raw?.authCode === 'string') {
      authCode = raw.authCode;
    }
    if (!authCode) {
      message.error($t('tenant.message.switchTenantFailed'));
      return;
    }
    const switchPayload = await switchTenantApi(authCode);
    const token = extractTokenFromSwitchPayload(switchPayload);
    if (!token) {
      message.error($t('tenant.message.switchTenantFailed'));
      return;
    }
    await applyTenantTokenAndRefresh(token);
    message.success($t('tenant.message.switchTenantSuccess'));
  } finally {
    switchingTenant.value = false;
  }
}

function openChangeTenant(record: BackendTenantItem) {
  const tenantName = String(record.tenantName ?? '');
  const tenantId = String(record.tenantId ?? record.id ?? '');
  const adminName = String(
    record.adminName ?? record.admin_name ?? record.adminAccount ?? '',
  );
  Modal.confirm({
    title: $t('tenant.modal.switchTenant'),
    content: $t('tenant.message.switchTenantConfirm', [
      tenantName,
      tenantId,
      adminName,
    ]),
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    async onOk() {
      await runSwitchTenant(record);
    },
  });
}
</script>

<template>
  <Page
    :auto-content-height="true"
    content-class="flex min-h-0 flex-col gap-3 p-4"
  >
    <!-- 搜索区域：与 system/menu 同一套布局与按钮样式 -->
    <div
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background p-6"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('tenant.list.tenantName')
          }}</span>
          <VbenInput
            v-model="searchTenantName"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('tenant.list.placeholderName')"
            @keydown.enter="handleSearch"
          />
        </div>
        <!-- <div class="flex items-center gap-2">
          <span class="shrink-0 text-sm text-muted-foreground">{{
            $t('tenant.list.tenantCode')
          }}</span>
          <VbenInput
            v-model="searchTenantCode"
            class="w-56 [&_input]:h-8"
            :placeholder="$t('tenant.list.placeholderCode')"
            @keydown.enter="handleSearch"
          />
        </div> -->
      </div>
      <div class="ml-auto flex shrink-0 items-center justify-end">
        <Space>
          <VbenButton
            class="w-[60px]"
            size="sm"
            variant="outline"
            @click="handleReset"
          >
            {{ $t('menu.action.reset') }}
          </VbenButton>
          <!-- prettier-ignore -->
          <VbenButton
            class="w-[60px]"
            size="sm"
            @click="handleSearch"
          >
            {{ $t('menu.action.search') }}
          </VbenButton>
        </Space>
      </div>
    </div>

    <div class="min-h-0 flex-1 rounded-lg border border-border bg-background">
      <Grid class="h-full min-h-0">
        <template #toolbar-actions>
          <div class="flex w-full items-center justify-between p-0 pb-2">
            <div class="text-base font-bold">{{ $t('tenant.tenantList') }}</div>
            <!-- prettier-ignore -->
            <VbenButton
              v-if="canButton(TENANT_PAGE_BUTTON_CODES.add)"
              class="w-[84px]"
              size="sm"
              @click="openAdd"
            >
              <Plus class="mr-1 size-4" />
              {{ $t('tenant.action.add') }}
            </VbenButton>
          </div>
        </template>

        <template #action="{ row }">
          <Button
            v-if="canButton(TENANT_PAGE_BUTTON_CODES.detail)"
            type="link"
            size="small"
            class="text-primary"
            @click="openDetail(row)"
          >
            {{ $t('tenant.action.detail') }}
          </Button>

          <Button
            v-if="canButton(TENANT_PAGE_BUTTON_CODES.edit)"
            type="link"
            size="small"
            class="text-primary"
            @click="openEdit(row)"
          >
            {{ $t('tenant.action.edit') }}
          </Button>
          <Button
            v-if="canButton(TENANT_PAGE_BUTTON_CODES.menuConfig)"
            type="link"
            size="small"
            class="text-primary"
            @click="openMenu(row)"
          >
            {{ $t('tenant.action.menuConfig') }}
          </Button>
          <Button
            v-if="canButton(TENANT_PAGE_BUTTON_CODES.changeTenant)"
            type="link"
            size="small"
            class="text-primary"
            :disabled="switchingTenant"
            @click="openChangeTenant(row)"
          >
            {{ $t('tenant.action.changeTenant') }}
          </Button>
        </template>
      </Grid>
      <!-- 有些情况下 Grid 内层背景会“盖住”边框，额外补一条底线保证可见 -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
      ></div>
    </div>

    <!-- prettier-ignore -->
    <AddOrUpdate
      ref="addOrUpdateRef"
      @success="reloadTenantGrid()"
    />
    <TenantDetail ref="tenantDetailRef" />
    <!-- prettier-ignore -->
    <TenantMenuConfig
      ref="tenantMenuConfigRef"
      @success="reloadTenantGrid()"
    />
  </Page>
</template>
