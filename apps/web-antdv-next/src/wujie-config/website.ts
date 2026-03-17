/**
 * 全局配置文件
 */
export default {
  title: 'sicui',
  key: 'sicui',
  clientId: 'saber', // 客户端id
  clientSecret: 'saber_secret', // 客户端密钥
  tokenHeader: 'DEFrame-Auth',
  statusWhiteList: [],
  switchMode: false, // 是否开启部门切换模式
  systemName: 'settings.pages.systemName', // 默认系统名称 (index.html/json文件)
  systemPageLogo: '/inspur.svg',
  loginLogo1: '/loginLogo1.png', // 默认登录页logo1
  loginLogo2: '/loginLogo2.svg', // 默认登录页logo2/ 默认导航栏logo
  projectCode: 'base',
  sm2PublicKey:
    '0324e5dcf3858e9088f281a721efcce2bba51729d0585beb25f2f0266d8186f3df',
  mapKey: '9a0c0c500e9f20d0f7070d628cec33ac', // 高德地图key
  mapSecurityJsCode: '8e5761bb3c105333f18a5bf2bdca675d', // 高德地图安全密钥
  forceShowLoginInfo: [
    'localhost:4000',
    'de.kwvolt.com',
    'micro-demo.kwvolt.com',
    'kwvolt-demo.kwvolt.com',
    'micro-test.kwvolt.com',
    'micro-dev.kwvolt.com',
  ], // 特定域名显示默认企业定制化信息
  /*
     公共平台
   * admin 系统管理前端仓库
   * resource 资源服务前端仓库
   * maintenance  运维服务前端仓库
   * template template模板前端仓库
   */

  /*
     业务平台
   * operations 光伏工商业务前端仓库
   * ...
   * 在此添加新的前端仓库，key值为projectCode
   */
  projectCodes: [
    'admin',
    'resource',
    'maintenance',
    'template',
    'operations',
    'energyStorage',
    'operationsnext',
    'virtualPowerPlant',
    'microGrid',
    'configuration',
    'hm',
  ],
};
