<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, ref } from 'vue';

import { AuthenticationForgetPassword, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

defineOptions({ name: 'ForgetPassword' });

const loading = ref(false);
const step = ref(1);
const isSendCodeLoading = ref(false);
const countdown = ref(0);

async function handleSendCode() {
  if (countdown.value > 0 || isSendCodeLoading.value) {
    return;
  }
  isSendCodeLoading.value = true;
  try {
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

const formSchema = computed((): VbenFormSchema[] => {
  if (step.value === 1) {
    return [
      {
        component: 'VbenInput',
        componentProps: {
          placeholder: $t('authentication.mobileTip'),
        },
        fieldName: 'phoneNumber',
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
          placeholder: $t('authentication.codeTip').replace('{0}', ''),
        },
        fieldName: 'code',
        label: $t('authentication.code'),
        rules: z
          .string({ required_error: $t('authentication.codeTip') })
          .min(1, { message: $t('authentication.codeTip') }),
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
      },
    ];
  }
  return [
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.newPasswordTip'),
      },
      fieldName: 'newPassword',
      label: $t('authentication.newPassword'),
      rules: z
        .string()
        .min(1, { message: $t('authentication.newPasswordTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.confirmNewPasswordTip'),
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({
              required_error: $t('authentication.confirmNewPasswordTip'),
            })
            .min(1, { message: $t('authentication.confirmNewPasswordTip') })
            .refine((value) => value === newPassword, {
              message: $t('authentication.confirmPasswordTip'),
            });
        },
        triggerFields: ['newPassword'],
      },
      fieldName: 'confirmPassword',
      label: $t('authentication.confirmNewPassword'),
    },
  ];
});

function handleSubmit(value: Recordable<any>) {
  if (step.value === 1) {
    step.value = 2;
  } else {
    // eslint-disable-next-line no-console
    console.log('reset password submit:', value);
  }
}

const title = computed(() => {
  return step.value === 1
    ? $t('authentication.forgetPassword')
    : $t('authentication.resetPassword');
});

const subTitle = computed(() => {
  return step.value === 1 ? $t('authentication.forgetPasswordSubtitle') : ' ';
});

const submitButtonText = computed(() => {
  return step.value === 1
    ? $t('authentication.nextStep')
    : $t('authentication.confirm');
});
</script>

<template>
  <AuthenticationForgetPassword
    :form-schema="formSchema"
    :loading="loading"
    :sub-title="subTitle"
    :submit-button-text="submitButtonText"
    :title="title"
    @submit="handleSubmit"
  />
</template>
