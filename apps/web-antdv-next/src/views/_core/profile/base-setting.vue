<script setup lang="ts">
import type { UserInfo } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'antdv-next';

import { getUserInfoApi, updateMineInfoApi } from '#/api';

const profileBaseSettingRef = ref();

/** 接口 roleName 为逗号分隔字符串，表单 tags 需 string[] */
function roleNameToTagValues(roleName: unknown): string[] {
  if (Array.isArray(roleName)) {
    return roleName
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof roleName === 'string') {
    return roleName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function tagValuesToRoleName(tags: unknown): string {
  if (Array.isArray(tags)) {
    return tags
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(',');
  }
  if (typeof tags === 'string') {
    return tags.trim();
  }
  return '';
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'name',
      component: 'Input',
      label: $t('profile.name'),
    },
    {
      fieldName: 'account',
      component: 'Input',
      label: $t('profile.account'),
    },
    {
      fieldName: 'roleName',
      component: 'Select',
      disabled: true,
      componentProps: {
        mode: 'tags',
      },
      label: $t('profile.role'),
    },
    {
      fieldName: 'introduction',
      component: 'Textarea',
      label: $t('profile.introduction'),
    },
  ];
});

onMounted(async () => {
  const data = await getUserInfoApi();
  profileBaseSettingRef.value.getFormApi().setValues({
    ...data,
    roleName: roleNameToTagValues((data as Record<string, unknown>).roleName),
  });
});

const handleSubmit = async (values: UserInfo & { roleName?: string[] }) => {
  try {
    await updateMineInfoApi({
      ...values,
      roleName: tagValuesToRoleName(values.roleName),
    });
    message.success('更新成功');
  } catch (error) {
    console.error(error);
  }
};
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    @submit="handleSubmit"
    :form-schema="formSchema"
  />
</template>
