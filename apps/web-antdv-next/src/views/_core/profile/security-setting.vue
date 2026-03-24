<script setup lang="ts">
import { computed } from 'vue';

import { ProfileSecuritySetting } from '@vben/common-ui';
import { $t } from '@vben/locales';

const formSchema = computed(() => {
  return [
    {
      value: true,
      fieldName: 'accountPassword',
      label: $t('profile.accountPassword'),
      description: $t('profile.accountPasswordDescription'),
    },
    {
      value: true,
      fieldName: 'securityPhone',
      label: $t('profile.securityPhone'),
      description: $t('profile.securityPhoneDescription'),
    },
    // {
    //   value: true,
    //   fieldName: 'securityQuestion',
    //   label: '密保问题',
    //   description: '未设置密保问题，密保问题可有效保护账户安全',
    // },
    // {
    //   value: true,
    //   fieldName: 'securityEmail',
    //   label: '备用邮箱',
    //   description: '已绑定邮箱：ant***sign.com',
    // },
    // {
    //   value: false,
    //   fieldName: 'securityMfa',
    //   label: 'MFA 设备',
    //   description: '未绑定 MFA 设备，绑定后，可以进行二次确认',
    // },
  ];
});
</script>
<template>
  <ProfileSecuritySetting :form-schema="formSchema" />
</template>
