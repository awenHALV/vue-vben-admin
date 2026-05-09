<script setup lang="ts">
defineOptions({
  name: 'IconChip',
});

const props = withDefaults(
  defineProps<{
    alt: string;
    /** 外层容器 class，默认 40×40 */
    frameClass?: string;
    imgClass?: string;
    src: string;
  }>(),
  {
    frameClass: 'size-10',
    imgClass: 'size-7',
  },
);
</script>

<template>
  <div
    class="box-content flex-center shrink-0 overflow-hidden rounded-full border border-[rgba(0,0,0,0.06)] bg-white dark:border-border dark:bg-muted"
    :class="props.frameClass"
  >
    <!-- prettier-ignore -->
    <img
      :alt="props.alt"
      :class="props.imgClass"
      :src="props.src"
    />
  </div>
</template>
