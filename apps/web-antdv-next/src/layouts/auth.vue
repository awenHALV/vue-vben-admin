<script lang="ts" setup>
import { AuthPageLayout } from '@vben/layouts';

import { $t } from '#/locales';

import logoDark from '/logo-dark.svg';
import logoLight from '/logo-light.svg';

// const appName = computed(() => preferences.app.name);
// const logo = computed(() => preferences.logo.source);
// const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <AuthPageLayout
    :logo="logoLight"
    :logo-dark="logoDark"
    :page-description="$t('authentication.pageDesc')"
    :page-title="$t('authentication.pageTitle')"
  >
    <!-- 自定义工具栏 -->
    <!-- <template #toolbar></template> -->
  </AuthPageLayout>
</template>
