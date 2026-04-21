<!-- TenantDetail.vue -->
<!-- 作者: inspur-iep-ai -->
<!-- 根据 MasterGo 设计稿优化样式，使用 Tailwind CSS 支持暗黑模式 -->

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
  const anyRaw = raw as unknown as Record<string, unknown>;
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
  class: 'w-[min(100%,560px)]',
  contentClass: 'p-0',
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
  <VbenModal :footer="false">
    <Spin :spinning="loading" class="min-h-[200px] w-full">
      <div v-if="detail && !loading" class="flex w-full flex-col gap-5 p-6">
        <!-- 租户信息 -->
        <section class="flex flex-col gap-5">
          <h3
            class="m-0 text-base/6 font-semibold text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
          >
            {{ $t('tenant.detail.sectionTenant') }}
          </h3>
          <div class="flex flex-col gap-5">
            <!-- 租户ID -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.id') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.tenantId) }}
                </span>
              </div>
            </div>
            <!-- 租户名称 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.tenantName') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.tenantName) }}
                </span>
              </div>
            </div>
            <!-- 公司名称 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.companyName') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.companyName) }}
                </span>
              </div>
            </div>
            <!-- 社会信用代码 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.creditCode') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.creditCode) }}
                </span>
              </div>
            </div>
            <!-- 状态 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.status') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ formatStatus(detail.status) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- 管理员信息 -->
        <section class="flex flex-col gap-5">
          <h3
            class="m-0 text-base/6 font-semibold text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
          >
            {{ $t('tenant.detail.sectionAdmin') }}
          </h3>
          <div class="flex flex-col gap-5">
            <!-- 管理员姓名 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.form.adminName') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.adminName) }}
                </span>
              </div>
            </div>
            <!-- 管理员手机号 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.list.adminPhone') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.adminPhone) }}
                </span>
              </div>
            </div>
            <!-- 管理员登录账号 -->
            <div class="flex flex-col gap-1">
              <label
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
              >
                {{ $t('tenant.detail.adminLoginAccount') }}
              </label>
              <div
                class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.04)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
              >
                <span
                  class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
                >
                  {{ displayText(detail.adminAccount) }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Spin>
  </VbenModal>
</template>
