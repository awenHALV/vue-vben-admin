import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings',
      order: 10,
      title: '系统管理',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'UserManagement',
        path: 'user',
        component: () => import('#/views/system/user-center/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: '用户管理',
        },
      },
      {
        name: 'OrganizationManagement',
        path: 'organization',
        component: () => import('#/views/system/user-center/org/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: '组织管理',
        },
      },
      {
        name: 'RoleManagement',
        path: 'role',
        component: () => import('#/views/system/user-center/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: '角色管理',
        },
      },
      {
        name: 'TenantManagement',
        path: 'tenant',
        component: () => import('#/views/system/tenant/index.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: '租户管理',
          keepAlive:true
        },
      },
      {
        name: 'MenuManagement',
        path: 'menu',
        component: () => import('#/views/system/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: '菜单管理',
        },
      },
      {
        name: 'DictManagement',
        path: 'dict',
        component: () => import('#/views/system/dict/index.vue'),
        meta: {
          icon: 'lucide:book-type',
          title: '系统字典',
        },
      },
    ],
  },
];

export default routes;
