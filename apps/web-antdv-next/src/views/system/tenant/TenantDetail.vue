<script lang="ts" setup>
import type { BackendTenantItem } from '#/api/core/tenant';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Spin } from 'antdv-next';

import { getTenantDetailApi } from '#/api/core/tenant';

defineOptions({ name: 'TenantDetail' });

const loading = ref(false);
const detail = ref<BackendTenantItem | null>(null);
const fetchId = ref<null | number | string>(null);

const statusLabel = computed(() => ({
  true: $t('tenant.status.enabled'),
  false: $t('tenant.status.disabled'),
}));

function formatStatus(v: unknown) {
  const enabled = Boolean(v ?? true);
  return enabled ? statusLabel.value.true : statusLabel.value.false;
}

function displayText(v: unknown) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/** 兼容详情接口 camelCase / snake_case */
function normalizeDetail(raw: BackendTenantItem): BackendTenantItem {
  const anyRaw = raw as Record<string, unknown>;
  return {
    ...raw,
    id: raw.id,
    tenantName: String(raw.tenantName ?? anyRaw.tenant_name ?? ''),
    adminName: String(raw.adminName ?? raw.admin_name ?? raw.contact ?? ''),
    adminPhone: String(raw.adminPhone ?? raw.admin_phone ?? raw.phone ?? ''),
    adminAccount: String(raw.adminAccount ?? anyRaw.admin_account ?? ''),
    status: raw.status,
  };
}

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  showCancelButton: false,
  showConfirmButton: false,
  cancelText: $t('common.cancel'),
  confirmText: $t('common.confirm'),
  title: $t('tenant.modal.detailTenant'),
  class: 'w-[min(100%,520px)]',
  contentClass: 'px-1',
  async onOpenChange(open) {
    if (!open) {
      detail.value = null;
      fetchId.value = null;
      return;
    }
    const id = fetchId.value;
    if (id === null || id === undefined) {
      return;
    }
    loading.value = true;
    detail.value = null;
    try {
      const raw = await getTenantDetailApi(id);
      detail.value = normalizeDetail(raw);
    } catch {
      message.error($t('tenant.message.detailFailed'));
      modalApi.close();
    } finally {
      loading.value = false;
    }
  },
  onConfirm() {
    modalApi.close();
  },
  onCancel() {
    modalApi.close();
  },
});

function open(record: Pick<BackendTenantItem, 'id'>) {
  fetchId.value = record.id;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal>
    <Spin
:spinning="loading" class="min-h-[100px] w-full"
>
      <div
v-if="detail && !loading" class="mx-6 flex flex-col gap-5"
>
        <!-- 租户信息 -->
        <section>
          <div class="mb-2 text-sm font-medium text-foreground">
            {{ $t('tenant.detail.sectionTenant') }}
          </div>
          <div
            class="overflow-hidden rounded-sm border border-border text-sm/6"
          >
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.id') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.id) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.tenantName') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.tenantName) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.companyName') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.companyName) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.creditCode') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.creditCode) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.status') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ formatStatus(detail.status) }}
              </div>
            </div>
          </div>
        </section>

        <!-- 管理员信息 -->
        <section>
          <div class="mb-2 text-sm font-medium text-foreground">
            {{ $t('tenant.detail.sectionAdmin') }}
          </div>
          <div
            class="overflow-hidden rounded-sm border border-border text-sm/6"
          >
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.form.adminName') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.adminName) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.list.adminPhone') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.adminPhone) }}
              </div>
            </div>
            <div
              class="grid grid-cols-[minmax(0,140px)_1fr] border-b border-border last:border-b-0"
            >
              <div
                class="border-r border-border bg-muted/50 px-3 py-2 text-muted-foreground"
              >
                {{ $t('tenant.detail.adminLoginAccount') }}
              </div>
              <div class="bg-background px-3 py-2">
                {{ displayText(detail.adminAccount) }}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Spin>
  </VbenModal>
</template>
