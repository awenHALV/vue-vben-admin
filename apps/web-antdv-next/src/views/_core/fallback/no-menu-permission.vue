<script lang="ts" setup>
import noAuthIllustration from '#/assets/no-auth.svg';
import { $t } from '#/locales';

defineOptions({ name: 'NoMenuPermission' });
</script>

<template>
  <div
    class="flex-col-center min-h-[calc(100vh-49px)] w-full bg-background px-4 py-10"
  >
    <div class="flex-col-center">
      <div class="rounded-lg border border-dashed border-border/70 bg-muted/30">
        <img
          :alt="$t('page.fallback.noMenuPermission')"
          :src="noAuthIllustration"
          class="mx-auto block h-[300px] w-[300px] max-w-full"
          draggable="false"
        />
      </div>
      <p class="mt-6 text-center text-base/relaxed text-foreground">
        <span>{{ $t('page.fallback.noMenuPermissionHint') }}</span>
        <span class="text-primary">{{
          $t('page.fallback.noMenuPermissionContact')
        }}</span>
      </p>
    </div>
  </div>
</template>
