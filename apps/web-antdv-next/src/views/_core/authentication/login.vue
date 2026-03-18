<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, h, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { getCaptchaApi } from '#/api';
import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const captchaId = ref('');
const captchaImg = ref('');

async function fetchCaptcha() {
  try {
    const data = await getCaptchaApi();
    captchaId.value = data.captchaId;
    captchaImg.value = data.captchaImg;
  } catch (error) {
    console.error('Failed to fetch captcha:', error);
  }
}

onMounted(() => {
  fetchCaptcha();
});

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'InputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'pwd',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('authentication.code'),
      },
      fieldName: 'captchaValue',
      label: $t('authentication.code'),
      renderComponentContent: () => ({
        suffix: () =>
          captchaImg.value
            ? h('img', {
                alt: 'captcha',
                class: 'h-7 cursor-pointer rounded-sm min-w-[100px]',
                key: captchaId.value,
                onClick: fetchCaptcha,
                src: captchaImg.value,
              })
            : null,
      }),
      rules: z.string().min(1, { message: $t('authentication.codeTip') }),
    },
  ];
});

async function handleSubmit(values: any) {
  await authStore.authLogin({
    ...values,
    captchaId: captchaId.value,
  });
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="handleSubmit"
  />
</template>
