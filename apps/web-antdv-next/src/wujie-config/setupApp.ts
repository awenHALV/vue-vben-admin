import WujieVue from 'wujie-vue3';

import domins from './app.config';
import website from './website';

const { setupApp: setupAppOfWujie, preloadApp } = WujieVue;

function geAttrs(projectCode: string) {
  // 修改iframe src attr，防止github pages csp报错
  return import.meta.env.PROD
    ? { src: `${window.location.origin}/${projectCode}Iframe` }
    : {};
}

function setupApp() {
  // const appStore = useAppStore();
  // let projectCodes = [];
  // appStore.platFormInfo.map((item) => {
  //   projectCodes = projectCodes.concat(item.projectCodes);
  // });
  // projectCodes = Array.from(new Set(projectCodes)).filter((item) => item);
  // console.log('基座预加载的项目：', projectCodes);

  website.projectCodes.forEach((projectCode) => {
    if (domins[projectCode]) {
      setupAppOfWujie({
        name: projectCode,
        attrs: geAttrs(projectCode),
        // 开发环境关闭保活：与 preload 根地址组合时，同 name 子应用易复用旧实例，子路由入口 fetch 异常或仍显示根页 404
        alive: import.meta.env.PROD,
      });
      // 预加载根地址；开发环境跳过，避免与带 path 的 microUrl 冲突
      if (import.meta.env.PROD) {
        preloadApp({
          name: projectCode,
          url: domins[projectCode],
        });
      }
    } else {
      console.error(
        `基座中没有配置项目${projectCode},请在基座app.config.js和环境文件中配置前端服务地址`,
      );
    }
  });
  // projectCodes.forEach((projectCode) => {
  //   if (domins[projectCode]) {
  //     setupAppOfWujie({
  //       name: projectCode,
  //       plugins,
  //       // fetch:credentialsFetch,
  //       attrs: geAttrs(projectCode),
  //       alive: true,
  //     });
  //     // 预加载,预加载能力可以极大的提升子应用打开的首屏时间
  //     preloadApp({
  //       name: projectCode,
  //       url: domins[projectCode],
  //     });
  //   } else {
  //     console.error(
  //       `基座中没有配置项目${projectCode},请在基座app.config.js和环境文件中配置前端服务地址`
  //     );
  //   }
  // });
}

export default setupApp;
