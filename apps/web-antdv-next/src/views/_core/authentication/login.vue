<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, h, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { getCaptchaApi } from '#/api';
import { switchTenantPublicApi } from '#/api/core/auth';
import { extractTokenFromSwitchPayload } from '#/composables/use-tenant-switch-flow';
import { useAuthStore } from '#/store';

import TenantSelectModal from './TenantSelectModal.vue';

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

const tenantModalRef = ref<InstanceType<typeof TenantSelectModal> | null>(null);

const tenantList = ref<Array<{ tenantId: string; tenantName: string }>>([]);
const selectedTenant = ref<string>('');

async function handleSubmit(values: any) {
  const params = {
    ...values,
    captchaId: captchaId.value,
  };
  try {
    const result: any = await authStore.authLogin(params);

    if (result?.needTenantSelection) {
      tenantList.value = result.tenantList || [];
      const [firstTenant] = tenantList.value;
      if (firstTenant) {
        selectedTenant.value = firstTenant.tenantId;
      }
      tenantModalRef.value?.open();
    }
  } catch (error: unknown) {
    console.error(error);
    if (loginType.value === 'account' && isUserLoginFailedError(error)) {
      await fetchCaptcha();
    }
  }
}

async function handleTenantConfirm() {
  if (!selectedTenant.value) {
    return;
  }
  authStore.loginLoading = true;
  try {
    tenantModalRef.value?.close();
    const payload = await switchTenantPublicApi({
      tenantId: selectedTenant.value,
    });
    const token = extractTokenFromSwitchPayload(payload);
    if (!token) {
      message.error($t('tenant.message.switchTenantFailed'));
      return;
    }
    await authStore.enterPlatformWithToken(token);
  } catch (error: unknown) {
    if (loginType.value === 'account' && isUserLoginFailedError(error)) {
      await fetchCaptcha();
    }
  } finally {
    authStore.loginLoading = false;
  }
}

function handleTenantCancel() {
  tenantModalRef.value?.close();
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

    <TenantSelectModal
      ref="tenantModalRef"
      v-model:selected-tenant="selectedTenant"
      :tenant-list="tenantList"
      @cancel="handleTenantCancel"
      @confirm="handleTenantConfirm"
    />
  </div>
</template>
