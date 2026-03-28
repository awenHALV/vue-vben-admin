import Cookies from 'js-cookie';

export const TOKEN_KEY = 'vben_token';

export function getCookie(key: string) {
  return Cookies.get(key);
}

export function setCookie(key: string, token: string, option = {}) {
  return Cookies.set(key, token, {
    secure: false,
    sameSite: 'Strict',
    ...option,
  });
}
export function removeCookie(key: string, option?: Cookies.CookieAttributes) {
  return Cookies.remove(key, option);
}

export const isLogin = () => {
  return getCookie(TOKEN_KEY);
};
