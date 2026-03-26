<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, h, onMounted, ref } from 'vue';

import {
  AuthenticationLogin,
  useVbenModal,
  VbenButton,
  VbenSelect,
  z,
} from '@vben/common-ui';
import { $t } from '@vben/locales';

import { getCaptchaApi } from '#/api';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

/** 登录失败（如密码错误）时需刷新图形验证码 */
const USER_LOGIN_FAILED_CODE = 'sys.user_login_failed';

function isUserLoginFailedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false;
  }
  const data = error as { code?: string };
  return data?.code === USER_LOGIN_FAILED_CODE;
}

const authStore = useAuthStore();

const captchaId = ref('');
const captchaImg = ref('');

const loginType = ref('account');

async function fetchCaptcha() {
  try {
    const data = await getCaptchaApi();
    captchaId.value = data.captchaId;
    captchaImg.value = data.captchaImg;
  } catch (error) {
    console.error('Failed to fetch captcha:', error);
  }
}

const isSendCodeLoading = ref(false);
const countdown = ref(0);

async function handleSendCode() {
  if (countdown.value > 0 || isSendCodeLoading.value) {
    return;
  }
  isSendCodeLoading.value = true;
  try {
    // 调用发送验证码接口
    // await sendSmsApi({ phoneNumber: ... });
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to send code:', error);
  } finally {
    isSendCodeLoading.value = false;
  }
}

onMounted(() => {
  fetchCaptcha();
});

const formSchema = computed((): VbenFormSchema[] => {
  if (loginType.value === 'mobile') {
    return [
      {
        component: 'VbenInput',
        componentProps: {
          placeholder: $t('authentication.mobileTip'),
        },
        fieldName: 'phoneNumber',
        formItemClass: 'col-span-12',
        label: $t('authentication.mobile'),
        rules: z
          .string({
            invalid_type_error: $t('authentication.mobileErrortip'),
            required_error: $t('authentication.mobileTip'),
          })
          .min(1, { message: $t('authentication.mobileTip') })
          .refine((v) => /^\d{11}$/.test(v), {
            message: $t('authentication.mobileErrortip'),
          }),
      },
      {
        component: 'VbenInput',
        componentProps: {
          placeholder: $t('authentication.code'),
        },
        fieldName: 'code',
        formItemClass: 'col-span-12',
        label: $t('authentication.code'),
        renderComponentContent: () => ({
          suffix: () =>
            h(
              'span',
              {
                class:
                  'vben-link cursor-pointer text-sm font-normal transition-all hover:text-primary min-w-[100px] text-center',
                onClick: handleSendCode,
              },
              countdown.value > 0
                ? $t('authentication.sendText', [countdown.value])
                : $t('authentication.sendCode'),
            ),
        }),
        rules: z
          .string({ required_error: $t('authentication.codeTip') })
          .min(1, { message: $t('authentication.codeTip') }),
      },
    ];
  }
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      formItemClass: 'col-span-12',
      label: $t('authentication.username'),
      rules: z
        .string({ required_error: $t('authentication.usernameTip') })
        .min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'pwd',
      formItemClass: 'col-span-12',
      label: $t('authentication.password'),
      rules: z
        .string({ required_error: $t('authentication.passwordTip') })
        .min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.code'),
      },
      fieldName: 'captchaValue',
      formItemClass: 'col-span-8',
      label: $t('authentication.code'),
      rules: z.string().min(1, { message: $t('authentication.codeTip') }),
    },
    {
      component: () =>
        h('img', {
          alt: 'captcha',
          class: 'h-10 w-full cursor-pointer rounded-sm',
          key: captchaId.value,
          onClick: fetchCaptcha,
          src: captchaImg.value,
        }),
      fieldName: 'captchaImage',
      formItemClass: 'col-span-4',
    },
  ];
});

const [Modal, modalApi] = useVbenModal();

const tenantList = ref<Array<{ tenantId: string; tenantName: string }>>([]);
const selectedTenant = ref<string>('');
const currentLoginParams = ref<any>({});

async function handleSubmit(values: any) {
  const params = {
    ...values,
    captchaId: captchaId.value,
  };
  try {
    const result: any = await authStore.authLogin(params);

    if (result?.needTenantSelection) {
      tenantList.value = result.tenantList || [];
      currentLoginParams.value = result.loginParams;
      const [firstTenant] = tenantList.value;
      if (firstTenant) {
        selectedTenant.value = firstTenant.tenantId;
      }
      modalApi.setState({ isOpen: true });
    }
  } catch (error: unknown) {
    console.log(error);
    if (loginType.value === 'account' && isUserLoginFailedError(error)) {
      await fetchCaptcha();
    }
  }
}

async function handleTenantConfirm() {
  if (!selectedTenant.value) return;
  authStore.loginLoading = true;
  try {
    modalApi.setState({ isOpen: false });
    await authStore.authLogin({
      ...currentLoginParams.value,
      tenantId: selectedTenant.value,
    });
  } catch (error: unknown) {
    if (loginType.value === 'account' && isUserLoginFailedError(error)) {
      await fetchCaptcha();
    }
  } finally {
    authStore.loginLoading = false;
  }
}

function handleTenantCancel() {
  modalApi.setState({ isOpen: false });
  authStore.clearToken();
}
</script>

<template>
  <div>
    <AuthenticationLogin
      v-model:login-type="loginType"
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      @submit="handleSubmit"
    />

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
        <!-- Banner -->
        <div
          class="relative flex h-32 items-center justify-between bg-linear-to-r from-[#eef2fc] to-[#f4f7fe] px-6 dark:from-[#1f2438] dark:to-[#171a28]"
        >
          <span class="text-xl font-medium text-foreground"
            >您可以选择以下租户登录</span
          >
          <div class="absolute right-0 bottom-0 opacity-80 dark:opacity-30">
            <!-- Decorative SVG matching the people icon concept from the image -->
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

        <!-- Form Content -->
        <div class="p-6">
          <VbenSelect
            v-model="selectedTenant"
            :options="
              tenantList.map((t) => ({
                value: t.tenantId,
                label: t.tenantName,
              }))
            "
            class="mb-6 h-10 w-full"
            placeholder="请选择租户"
          />
          <div class="flex justify-between gap-4">
            <VbenButton
              class="h-10 flex-1"
              variant="outline"
              @click="handleTenantCancel"
            >
              取消
            </VbenButton>
            <VbenButton class="h-10 flex-1"
@click="handleTenantConfirm">
              确定
            </VbenButton>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>
