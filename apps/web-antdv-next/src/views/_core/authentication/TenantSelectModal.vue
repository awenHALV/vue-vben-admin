<script lang="ts" setup>
import { useVbenModal, VbenButton, VbenSelect } from '@vben/common-ui';
import { $t } from '@vben/locales';

defineOptions({ name: 'TenantSelectModal' });

export interface TenantSelectItem {
  tenantId: string;
  tenantName: string;
}

const props = withDefaults(
  defineProps<{
    confirmLoading?: boolean;
    tenantList: TenantSelectItem[];
  }>(),
  {
    confirmLoading: false,
  },
);

const selectedTenant = defineModel<string>('selectedTenant', { required: true });

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const [Modal, modalApi] = useVbenModal();

function open() {
  modalApi.setState({ isOpen: true });
}

function close() {
  modalApi.setState({ isOpen: false });
}

defineExpose({
  close,
  modalApi,
  open,
});

function onConfirm() {
  if (!selectedTenant.value) {
    return;
  }
  emit('confirm');
}

function onCancel() {
  emit('cancel');
}
</script>

<template>
  <Modal
    :closable="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :footer="false"
    :fullscreen-button="false"
    :header="false"
    class="border-none p-0 shadow-xl sm:w-[420px] sm:rounded-lg"
  >
    <div class="overflow-hidden rounded-lg bg-background text-left">
      <div
        class="relative flex h-32 items-center justify-between bg-linear-to-r from-[#eef2fc] to-[#f4f7fe] px-6 dark:from-[#1f2438] dark:to-[#171a28]"
      >
        <span class="text-xl font-medium text-foreground">
          {{ $t('authentication.tenantSelectTitle') }}
        </span>
        <div class="absolute right-0 bottom-0 opacity-80 dark:opacity-30">
          <svg
            class="size-32 translate-4 text-primary"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            />
          </svg>
        </div>
      </div>

      <div class="p-6">
        <VbenSelect
          v-model="selectedTenant"
          :options="
            props.tenantList.map((t) => ({
              value: t.tenantId,
              label: t.tenantName,
            }))
          "
          class="mb-6 h-10 w-full"
          :placeholder="$t('authentication.tenantSelectPlaceholder')"
        />
        <div class="flex justify-between gap-4">
          <VbenButton
            class="h-10 flex-1"
            variant="outline"
            @click="onCancel"
          >
            {{ $t('common.cancel') }}
          </VbenButton>
          <VbenButton
            class="h-10 flex-1"
            :loading="confirmLoading"
            @click="onConfirm"
          >
            {{ $t('authentication.tenantSelectOk') }}
          </VbenButton>
        </div>
      </div>
    </div>
  </Modal>
</template>
