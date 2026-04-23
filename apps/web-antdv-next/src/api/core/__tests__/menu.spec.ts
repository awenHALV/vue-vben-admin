import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockBuildMicroUrl,
  mockGetMicroProjectCodeFromRoutePath,
  mockRequestGet,
} = vi.hoisted(() => ({
  mockBuildMicroUrl: vi.fn(),
  mockGetMicroProjectCodeFromRoutePath: vi.fn(),
  mockRequestGet: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  requestClient: {
    get: mockRequestGet,
  },
}));

vi.mock('#/router/component-map', () => ({
  mappedFeatureCodes: [],
}));

vi.mock('#/wujie-config/micro-route', () => ({
  buildMicroUrl: mockBuildMicroUrl,
  getMicroProjectCodeFromRoutePath: mockGetMicroProjectCodeFromRoutePath,
}));

import { getAllMenusApi } from '../menu';

describe('getAllMenusApi', () => {
  beforeEach(() => {
    mockRequestGet.mockReset();
    mockBuildMicroUrl.mockReset();
    mockGetMicroProjectCodeFromRoutePath.mockReset();

    mockBuildMicroUrl.mockImplementation(
      (projectCode: string, hostRoutePath: string) =>
        `https://${projectCode}.example.com${hostRoutePath}`,
    );
    mockGetMicroProjectCodeFromRoutePath.mockReturnValue(undefined);
  });

  it('中间父级没有 routePath 时，子级应直接使用自身路由', async () => {
    mockRequestGet.mockResolvedValue([
      {
        id: 1,
        parentId: null,
        featureCode: 'system',
        featureName: '系统管理',
        featureType: 'MENU',
        routePath: '/system',
        children: [
          {
            id: 2,
            parentId: 1,
            featureCode: 'tenant-group',
            featureName: '租户分组',
            featureType: 'MENU',
            routePath: '',
            children: [
              {
                id: 3,
                parentId: 2,
                featureCode: 'tenant',
                featureName: '租户管理',
                featureType: 'MENU',
                routePath: '/tenant',
                children: [],
              },
            ],
          },
        ],
      },
    ]);

    const routes = await getAllMenusApi();

    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe('/system');
    expect(routes[0]?.children?.[0]?.path).toBe('');
    expect(routes[0]?.children?.[0]?.children?.[0]?.path).toBe('/tenant');
  });

  it('顶层父级没有 routePath 时，应保持布局目录并由子级加载微前端', async () => {
    mockGetMicroProjectCodeFromRoutePath.mockImplementation(
      (routePath: string | undefined) => {
        return routePath === '/vpp/tenant/home'
          ? 'vpp'
          : undefined;
      },
    );

    mockRequestGet.mockResolvedValue([
      {
        id: 1,
        parentId: null,
        featureCode: 'micro-group',
        featureName: '微前端目录',
        featureType: 'MENU',
        routePath: '',
        children: [
          {
            id: 2,
            parentId: 1,
            featureCode: 'tenant-home',
            featureName: '租户首页',
            featureType: 'MENU',
            routePath: '/vpp/tenant/home',
            children: [],
          },
        ],
      },
    ]);

    const routes = await getAllMenusApi();

    expect(routes[0]?.path).toBe('/__group__/micro-group');
    expect(routes[0]?.component).toBe('BasicLayout');
    expect(routes[0]?.meta?.microName).toBeUndefined();
    expect(routes[0]?.children?.[0]?.path).toBe('/vpp/tenant/home');
    expect(routes[0]?.children?.[0]?.component).toBe('micro/index');
    expect(routes[0]?.children?.[0]?.meta?.microName).toBe('vpp');
    expect(routes[0]?.children?.[0]?.meta?.microUrl).toBe(
      'https://vpp.example.com/vpp/tenant/home',
    );
  });

  it('一二级菜单都没有 routePath 时，二级目录应使用 ParentLayout', async () => {
    mockGetMicroProjectCodeFromRoutePath.mockImplementation(
      (routePath: string | undefined) => {
        return routePath === '/vpp/ai-trading-decision/power-generation-forecast'
          ? 'vpp'
          : undefined;
      },
    );

    mockRequestGet.mockResolvedValue([
      {
        id: 1,
        parentId: null,
        featureCode: 'ai-root',
        featureName: 'AI 决策',
        featureType: 'MENU',
        routePath: '',
        children: [
          {
            id: 2,
            parentId: 1,
            featureCode: 'ai-sub-group',
            featureName: '发电预测',
            featureType: 'MENU',
            routePath: '',
            children: [
              {
                id: 3,
                parentId: 2,
                featureCode: 'power-generation-forecast',
                featureName: '功率预测',
                featureType: 'MENU',
                routePath: '/vpp/ai-trading-decision/power-generation-forecast',
                children: [],
              },
            ],
          },
        ],
      },
    ]);

    const routes = await getAllMenusApi();

    expect(routes[0]?.path).toBe('/__group__/ai-root');
    expect(routes[0]?.component).toBe('BasicLayout');
    expect(routes[0]?.children?.[0]?.path).toBe('__group__/ai-sub-group');
    expect(routes[0]?.children?.[0]?.component).toBe('ParentLayout');
    expect(routes[0]?.children?.[0]?.children?.[0]?.path).toBe(
      '/vpp/ai-trading-decision/power-generation-forecast',
    );
    expect(routes[0]?.children?.[0]?.children?.[0]?.component).toBe(
      'micro/index',
    );
    expect(routes[0]?.children?.[0]?.children?.[0]?.meta?.microName).toBe(
      'vpp',
    );
  });
});
