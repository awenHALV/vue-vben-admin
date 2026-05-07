<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '@vben-core/form-ui';

import type { AuthenticationProps } from './types';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { useVbenForm } from '@vben-core/form-ui';
import { VbenButton, VbenCheckbox } from '@vben-core/shadcn-ui';

import Title from './auth-title.vue';

interface Props extends AuthenticationProps {
  formSchema?: VbenFormSchema[];
}

defineOptions({
  name: 'AuthenticationLogin',
});

const props = withDefaults(defineProps<Props>(), {
  codeLoginPath: '/auth/code-login',
  forgetPasswordPath: '/auth/forget-password',
  formSchema: () => [],
  loading: false,
  qrCodeLoginPath: '/auth/qrcode-login',
  registerPath: '/auth/register',
  showCodeLogin: true,
  showForgetPassword: false,
  showQrcodeLogin: false,
  showRegister: false,
  showRememberMe: true,
  showThirdPartyLogin: false,
  submitButtonText: '',
  subTitle: '',
  title: '',
  loginType: 'account',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const loginType = defineModel<string>('loginType', { default: 'account' });
const [Form, formApi] = useVbenForm(
  reactive({
    commonConfig: {
      formItemClass: 'col-span-12',
      hideLabel: true,
      hideRequiredMark: true,
    },
    focusFirstError: true,
    schema: computed(() => props.formSchema),
    showDefaultActions: false,
    wrapperClass: 'grid-cols-12',
  }),
);
const router = useRouter();

const REMEMBER_ME_KEY = `REMEMBER_ME_USERNAME_${location.hostname}`;

const localUsername = localStorage.getItem(REMEMBER_ME_KEY) || '';

const rememberMe = ref(!!localUsername);

async function handleSubmit() {
  const { valid } = await formApi.validate();
  const values = await formApi.getValues();
  if (valid) {
    localStorage.setItem(
      REMEMBER_ME_KEY,
      rememberMe.value ? values?.username : '',
    );
    emit('submit', values);
  }
}

function handleGo(path: string) {
  router.push(path);
}

onMounted(() => {
  if (localUsername) {
    formApi.setFieldValue('username', localUsername);
  }
});

function handleTabChange(type: string) {
  if (loginType.value === type) return;
  loginType.value = type;
  if (type === 'account' && localUsername) {
    nextTick(() => {
      formApi.setFieldValue('username', localUsername, false);
    });
  }
}

defineExpose({
  getFormApi: () => formApi,
});
</script>

<template>
  <div class="w-full" @keydown.enter.prevent="handleSubmit">
    <slot name="title">
      <Title>
        <slot name="title">
          {{ title || $t('authentication.welcomeBack') }}
        </slot>
        <template #desc>
          <slot name="subTitle">
            {{ subTitle || $t('authentication.loginSubtitle') }}
          </slot>
        </template>
      </Title>
    </slot>

    <div class="mb-6 flex gap-2 rounded-lg bg-muted/50 p-1">
      <div
        class="flex-1 cursor-pointer rounded-md px-4 py-2 text-center text-sm font-medium transition-all"
        :class="
          loginType === 'account'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="handleTabChange('account')"
      >
        {{ $t('authentication.accountLogin') }}
      </div>
      <div
        v-if="showCodeLogin"
        class="flex-1 cursor-pointer rounded-md px-4 py-2 text-center text-sm font-medium transition-all"
        :class="
          loginType === 'mobile'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="handleTabChange('mobile')"
      >
        {{ $t('authentication.mobileLogin') }}
      </div>
    </div>

    <Form :key="loginType" class="mb-4" />

    <div
      v-if="showRememberMe || showForgetPassword"
      class="mb-4 flex justify-between"
    >
      <div class="flex-center">
        <VbenCheckbox
          v-if="showRememberMe"
          v-model="rememberMe"
          name="rememberMe"
        >
          {{ $t('authentication.rememberMe') }}
        </VbenCheckbox>
      </div>

      <span
        v-if="showForgetPassword"
        class="vben-link text-sm font-normal"
        @click="handleGo(forgetPasswordPath)"
      >
        {{ $t('authentication.forgetPassword') }}
      </span>
    </div>

    <VbenButton
      :class="{
        'cursor-pointer': !loading,
        'cursor-wait': loading,
      }"
      :loading="loading"
      aria-label="login"
      class="h-10 w-full"
      @click="handleSubmit"
    >
      {{ submitButtonText || $t('common.login') }}
    </VbenButton>

    <!-- 第三方登录 -->
    <!-- <slot name="third-party-login">
      <ThirdPartyLogin v-if="showThirdPartyLogin" />
    </slot> -->

    <slot name="to-register">
      <div v-if="showRegister" class="mt-6 flex items-center justify-center gap-1 text-sm">
        <span class="text-muted-foreground">{{ $t('authentication.accountTip') }}</span>
        <span
          class="vben-link font-medium"
          @click="handleGo(registerPath)"
        >
          {{ $t('authentication.createAccount') }}
        </span>
      </div>
    </slot>
  </div>
</template>
