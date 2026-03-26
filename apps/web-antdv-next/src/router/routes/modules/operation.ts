import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:briefcase',
      order: 9,
      title: '运营管理',
    },
    name: 'Operation',
    path: '/operation',
    children: [
      {
        name: 'ConsultationManagement',
        path: 'consultation',
        component: () => import('#/views/operation/consultation/index.vue'),
        meta: {
          icon: 'lucide:message-circle',
          title: '咨询信息',
        },
      },
    ],
  },
];

export default routes;
