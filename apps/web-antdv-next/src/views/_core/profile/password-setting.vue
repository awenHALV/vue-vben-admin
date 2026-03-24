<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'antdv-next';

import { updateMinePasswordApi } from '#/api/core/user';
import { encryptByMd5 } from '#/utils/cipher';

const passwordSettingRef = ref<InstanceType<typeof ProfilePasswordSetting>>();

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: '旧密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入旧密码',
      },
    },
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
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
    message.success('密码修改成功');
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
