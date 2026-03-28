import WujieVue from 'wujie-vue3';

import domins from './app.config';
import website from './website';

const { setupApp: setupAppOfWujie } = WujieVue;

function geAttrs(projectCode: string) {
  // 修改iframe src attr，防止github pages csp报错
  return import.meta.env.PROD
    ? { src: `${window.location.origin}/${projectCode}Iframe` }
    : {};
}

function setupApp() {
  website.projectCodes.forEach((projectCode) => {
    if (domins[projectCode]) {
      setupAppOfWujie({
        name: projectCode,
        attrs: geAttrs(projectCode),
        /**
         * 必须为 false：基座按菜单把完整子应用 URL 写在 :url（同 name、不同 path）。
         * wujie 在 alive=true 且已存在 shadowRoot 时，active() 会直接 return，不会应用新 url，
         * 线上表现为「切换菜单仍停在第一次打开的页面」。
         * 若需保活，应改为子应用单入口 + 内驱路由，或 sync/prefix 与主应用同步，而非反复改完整 url。
         * 勿对「仅域名根」做 preloadApp：会与首屏 meta.microUrl（含 path）错位。
         */
        alive: false,
      });
    } else {
      console.error(
        `基座中没有配置项目${projectCode},请在基座app.config.js和环境文件中配置前端服务地址`,
      );
    }
  });
}

export default setupApp;
