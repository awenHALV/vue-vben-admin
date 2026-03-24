<script setup lang="ts">
import { computed } from 'vue';

import { ProfileNotificationSetting } from '@vben/common-ui';

import {$t} from '@vben/locales'

const formSchema = computed(() => {
  return [
    {
      value: true,
      fieldName: 'accountPassword',
      label: $t('profile.accountPassword'),
      description: $t('profile.accountDescription'),
    },
    {
      value: true,
      fieldName: 'systemMessage',
      label: $t('profile.systemMessage'),
      description: $t('profile.systemMessageDescription'),
    },
    {
      value: true,
      fieldName: 'todoTask',
      label: $t('profile.todoTask'),
      description: $t('profile.todoTaskDescription'),
    },
  ];
});
</script>
<template>
  <ProfileNotificationSetting :form-schema="formSchema" />
</template>
