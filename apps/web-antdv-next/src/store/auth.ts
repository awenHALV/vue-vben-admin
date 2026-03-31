import type { Recordable, UserInfo } from '@vben/types';

import type { AuthApi } from '#/api/core/auth';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';
import { removeCookie, setCookie, TOKEN_KEY } from '@vben/utils';

import { notification } from 'antdv-next';
import { defineStore } from 'pinia';

import { getUserInfoApi, logoutApi } from '#/api';
import { getTenantListApi, loginApi } from '#/api/core/auth';
import { $t } from '#/locales';
import { encryptByMd5 } from '#/utils/cipher';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;

      // 对密码进行加密
      const loginParams: AuthApi.LoginParams = {
        ...params,
        pwd: params.pwd ? encryptByMd5(params.pwd) : undefined,
      };

      const { token, multiTenant } = await loginApi(loginParams);
      // 如果成功获取到 token
      if (token) {
        accessStore.setAccessToken(token);
        setCookie(TOKEN_KEY, token);

        if (multiTenant && !params.tenantId) {
          // Fetch tenant list since it's not provided by loginApi directly
          const tenantList = await getTenantListApi();

          loginLoading.value = false;
          return {
            needTenantSelection: true,
            tenantList,
            loginParams,
          };
        }
        // 获取用户信息并存储到 accessStore 中
        // const [fetchUserInfoResult, accessCodes] = await Promise.all([
        //   fetchUserInfo(),
        //   getAccessCodesApi(),
        // ]);

        const fetchUserInfoResult = await fetchUserInfo();
        // const accessCodes = await getAccessCodesApi();

        userInfo = fetchUserInfoResult;
        userStore.setUserInfo(userInfo);
        // accessStore.setAccessCodes(accessCodes);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        }
        // 登录成功均需进入业务页；此前 loginExpired 分支未 push，会导致「过期后重新登录」不跳转
        await (onSuccess
          ? onSuccess?.()
          : router.push(userInfo.homePath || preferences.app.defaultHomePath));

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            title: $t('authentication.loginSuccess'),
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  /**
   * 仅前端清会话并回登录页（不调退出登录接口）。
   * 用于 401/令牌作废等场景；用户主动退出请用 logout()。
   */
  async function terminateSession(redirect: boolean = true) {
    resetAllStores();
    removeCookie(TOKEN_KEY);
    accessStore.setLoginExpired(false);

    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  /**
   * 用户主动调用退出登录时，触发 logout
   */
  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    await terminateSession(redirect);
  }

  async function fetchUserInfo() {
    const userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  function clearToken() {
    accessStore.setAccessToken(null);
    removeCookie(TOKEN_KEY);
  }

  return {
    $reset,
    authLogin,
    clearToken,
    fetchUserInfo,
    loginLoading,
    logout,
    terminateSession,
  };
});
