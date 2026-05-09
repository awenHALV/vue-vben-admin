<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Input } from 'antdv-next';

defineOptions({
  name: 'ComposerFooter',
});

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    modelValue?: string;
    /** 等待接口返回（流式未结束）时禁用发送 */
    pending?: boolean;
    placeholder?: string;
    showDisclaimer?: boolean;
  }>(),
  {
    disabled: false,
    pending: false,
    modelValue: '',
    placeholder: '有什么可以帮助你的',
    showDisclaimer: true,
  },
);

const emit = defineEmits<{
  submit: [text: string];
  'update:modelValue': [value: string];
}>();

const localValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v;
  },
);

const value = computed({
  get: () => localValue.value,
  set: (v: string) => {
    localValue.value = v;
    emit('update:modelValue', v);
  },
});

const isComposing = ref(false);

const canSend = computed(() => {
  if (props.disabled) return false;
  if (props.pending) return false;
  if (isComposing.value) return false;
  return true;
});

const sendButtonClass = computed(() => {
  const base =
    'm-0! flex-center size-8 min-h-8 min-w-8 shrink-0 rounded-full p-0!';
  return canSend.value ? base : `${base} opacity-60`;
});

function submit() {
  const text = value.value.trim();
  if (!text) return;
  emit('submit', text);
  emit('update:modelValue', '');
  value.value = '';
}
</script>

<template>
  <div
    class="border-t border-[rgba(0,0,0,0.06)] bg-white p-4 dark:border-border dark:bg-background"
  >
    <div
      class="flex h-11 min-h-11 items-center gap-2 rounded-full border border-[#D9D9D9] bg-white pr-1.5 pl-3 dark:border-border dark:bg-background"
    >
      <IconifyIcon
        icon="lucide:paperclip"
        class="size-5 shrink-0 text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
      />
      <Input
        v-model:value="value"
        class="min-w-0 flex-1 border-0! bg-transparent! px-0! text-sm shadow-none! focus:shadow-none! dark:text-foreground"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        @compositionstart="isComposing = true"
        @compositionend="isComposing = false"
        @press-enter="submit"
      />
      <Button
        :class="sendButtonClass"
        type="primary"
        :disabled="!canSend"
        shape="circle"
        aria-label="发送"
        @click="submit"
      >
        <IconifyIcon icon="lucide:arrow-up" class="size-4" />
      </Button>
    </div>
    <div
      v-if="props.showDisclaimer"
      class="mt-2 text-center text-xs text-[rgba(0,0,0,0.45)] dark:text-muted-foreground"
    >
      内容由大模型生成，仅供参考。相关风险需自行承担。
    </div>
  </div>
</template>
