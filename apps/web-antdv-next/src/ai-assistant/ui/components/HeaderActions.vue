<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

import { Button } from 'antdv-next';

defineOptions({
  name: 'HeaderActions',
});

const props = withDefaults(
  defineProps<{
    /** 按钮组间距，如 gap-4（抽屉）或 gap-1（全屏） */
    gapClass?: string;
    panelMode: 'chat' | 'history';
    /** 切换视图图标：抽屉用 lucide:maximize-2，全屏用 lucide:minimize-2 */
    toggleIcon: string;
  }>(),
  {
    gapClass: 'gap-4',
  },
);

const emit = defineEmits<{
  close: [];
  newChat: [];
  toggleView: [];
}>();

const iconBtnClass =
  'group cursor-pointer m-0! flex-center size-8 rounded-md p-0! text-foreground/85 hover:bg-muted hover:p-1! hover:text-foreground';

const iconClass = 'size-5 text-inherit';
</script>

<template>
  <div class="flex items-center" :class="[props.gapClass]">
    <Button
      v-if="props.panelMode !== 'history'"
      :class="iconBtnClass"
      type="text"
      aria-label="新对话"
      @click="emit('newChat')"
    >
      <IconifyIcon icon="lucide:plus" :class="iconClass" />
    </Button>

    <Button
      :class="iconBtnClass"
      type="text"
      aria-label="切换视图"
      @click="emit('toggleView')"
    >
      <IconifyIcon :icon="props.toggleIcon" :class="iconClass" />
    </Button>

    <Button
      :class="iconBtnClass"
      type="text"
      aria-label="关闭"
      @click="emit('close')"
    >
      <IconifyIcon icon="lucide:x" :class="iconClass" />
    </Button>
  </div>
</template>
