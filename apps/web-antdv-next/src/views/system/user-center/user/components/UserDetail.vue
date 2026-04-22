<script lang="ts" setup>
import type { UserInfo } from '#/api/system/user';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'UserDetail' });

interface OptionItem {
  optionKey: string;
  optionValue: string;
}

const detailData = ref<Partial<UserInfo>>({});
const statusOptions = ref<OptionItem[]>([]);

const viewModel = computed(() => {
  const data = detailData.value;

  const renderStatus = (status: number) => {
    const opt = statusOptions.value.find((o) => o.optionKey === String(status));
    return opt ? opt.optionValue : String(status);
  };

  const renderRoles = (roles: string) => {
    if (!roles) return '—';
    return roles.split(',').join('、');
  };

  const displayText = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  };

  return {
    account: displayText(data.account),
    name: displayText(data.name),
    status: displayText(renderStatus(data.status ?? 1)),
    phone: displayText(data.phone),
    email: displayText(data.email),
    org: displayText(data.deptName),
    role: displayText(renderRoles(data.roleName || '')),
  };
});

const [VbenModal, modalApi] = useVbenModal({
  destroyOnClose: true,
  title: $t('system.user.userDetails'),
  class: 'w-[min(100%,700px)]',
  contentClass: 'p-0',
  onOpenChange(open: boolean) {
    if (!open) {
      detailData.value = {};
    }
  },
  onConfirm() {
    modalApi.close();
  },
  onCancel() {
    modalApi.close();
  },
});

function open(data: Partial<UserInfo>, options: OptionItem[] = []) {
  detailData.value = { ...data };
  statusOptions.value = options;
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <VbenModal :footer="false">
    <div class="flex w-full flex-col gap-5 p-6">
      <section class="flex flex-col gap-5">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.account') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.account }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.name') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.name }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.common.status') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.status }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.phone') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.phone }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.email') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.email }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.org') }}
            </label>
            <div
              class="flex h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.org }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label
              class="text-sm leading-[22px] text-[rgba(0,0,0,0.65)] dark:text-[rgba(255,255,255,0.65)]"
            >
              {{ $t('system.user.role') }}
            </label>
            <div
              class="flex min-h-8 items-center rounded-md border border-transparent bg-[rgba(0,0,0,0.02)] px-3 py-[5px] dark:bg-[rgba(255,255,255,0.08)]"
            >
              <span
                class="text-sm leading-[22px] text-[rgba(0,0,0,0.88)] dark:text-[rgba(255,255,255,0.85)]"
              >
                {{ viewModel.role }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </VbenModal>
</template>
