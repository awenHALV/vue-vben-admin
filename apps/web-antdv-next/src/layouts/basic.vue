<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'antdv-next';
import { storeToRefs } from 'pinia';

import { getTenantListApi } from '#/api/core/auth';
import { useTenantSwitchFlow } from '#/composables/use-tenant-switch-flow';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import TenantSelectModal from '#/views/_core/authentication/TenantSelectModal.vue';

const notifications = ref<NotificationItem[]>([
  {
    id: 1,
    avatar: 'https://avatar.vercel.sh/vercel.svg?text=VB',
    date: '3小时前',
    isRead: true,
    message: '描述信息描述信息描述信息',
    title: '收到了 14 份新周报',
  },
  {
    id: 2,
    avatar: 'https://avatar.vercel.sh/1',
    date: '刚刚',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '朱偏右 回复了你',
  },
  {
    id: 3,
    avatar: 'https://avatar.vercel.sh/1',
    date: '2024-01-01',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '曲丽丽 评论了你',
  },
  {
    id: 4,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '代办提醒',
  },
  {
    id: 5,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '跳转Workspace示例',
    link: '/workspace',
  },
  {
    id: 6,
    avatar: 'https://avatar.vercel.sh/satori',
    date: '1天前',
    isRead: false,
    message: '描述信息描述信息描述信息',
    title: '跳转外部链接示例',
    link: 'https://doc.vben.pro',
  },
]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const { isMultiTenant } = storeToRefs(authStore);
const { switchTenantByTenantId } = useTenantSwitchFlow(router);
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const tenantModalRef = ref<InstanceType<typeof TenantSelectModal> | null>(null);
const headerTenantList = ref<Array<{ tenantId: string; tenantName: string }>>(
  [],
);
const headerSelectedTenant = ref('');
const headerTenantConfirmLoading = ref(false);

async function openSwitchTenantModal() {
  try {
    const list = await getTenantListApi();
    headerTenantList.value = list.map((t) => ({
      tenantId: String(t.tenantId),
      tenantName: t.tenantName,
    }));
    const [first] = headerTenantList.value;
    headerSelectedTenant.value = first ? first.tenantId : '';
    tenantModalRef.value?.open();
  } catch {
    message.error($t('tenant.message.switchTenantFailed'));
  }
}

async function handleHeaderTenantConfirm() {
  if (!headerSelectedTenant.value) {
    return;
  }
  headerTenantConfirmLoading.value = true;
  try {
    await switchTenantByTenantId(headerSelectedTenant.value);
    tenantModalRef.value?.close();
  } finally {
    headerTenantConfirmLoading.value = false;
  }
}

function handleHeaderTenantCancel() {
  tenantModalRef.value?.close();
}

const menus = computed(() => {
  const items = [
    {
      handler: () => {
        router.push({ name: 'Profile' });
      },
      icon: 'lucide:user',
      text: $t('page.auth.profile'),
    },
    {
      handler: () => {
        router.push({ name: 'DownloadCenter' });
      },
      icon: 'lucide:download',
      text: $t('page.downloadCenter.title'),
    },
  ];
  if (isMultiTenant.value) {
    items.push({
      handler: () => {
        void openSwitchTenantModal();
      },
      icon: 'lucide:building-2',
      text: $t('page.auth.switchTenant'),
    });
  }
  return items;
});

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}
watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.name} - ${userStore.userInfo?.account}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar="userStore.userInfo?.avatar"
        :menus
        :text="userStore.userInfo?.name"
        :description="userStore.userInfo?.account"
        @logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
      />
    </template>
    <template #extra>
      <TenantSelectModal
        ref="tenantModalRef"
        v-model:selected-tenant="headerSelectedTenant"
        :confirm-loading="headerTenantConfirmLoading"
        :tenant-list="headerTenantList"
        @cancel="handleHeaderTenantCancel"
        @confirm="handleHeaderTenantConfirm"
      />
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar="avatar" @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
