<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { updateMinePasswordApi } from '#/api/core/user';
import { encryptByMd5 } from '#/utils/cipher';

const passwordSettingRef = ref<InstanceType<typeof ProfilePasswordSetting>>();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: $t('profile.oldPassword'),
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('profile.oldPasswordPlaceholder'),
      },
    },
    {
      fieldName: 'newPassword',
      label: $t('profile.newPassword'),
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('profile.newPasswordPlaceholder'),
      },
    },
    {
      fieldName: 'confirmPassword',
      label: $t('profile.confirmPassword'),
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: $t('profile.confirmPasswordPlaceholder'),
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({
              required_error: $t('profile.confirmPasswordPlaceholder'),
            })
            .min(1, { message: $t('profile.confirmPasswordPlaceholder') })
            .refine((value) => value === newPassword, {
              message: $t('profile.confirmPasswordTip'),
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

const submitting = ref(false);

async function handleSubmit(values: Recordable<string>) {
  if (submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    await updateMinePasswordApi({
      oldPwd: encryptByMd5(String(values.oldPassword ?? '')),
      newPwd: encryptByMd5(String(values.newPassword ?? '')),
    });
    message.success($t('profile.passwordChangeSuccess'));
    passwordSettingRef.value?.getFormApi()?.resetForm();
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <ProfilePasswordSetting
    ref="passwordSettingRef"
    class="w-1/2"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
