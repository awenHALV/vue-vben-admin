import { describe, expect, it } from 'vitest';

import {
  getMicroProjectCodeFromRoutePath,
  getRoutePathFirstSegment,
} from '../micro-route';

describe('micro-route fallback route handling', () => {
  it('当前 routePath 为空时，应回退到子菜单 routePath 取首段', () => {
    expect(getRoutePathFirstSegment('', ['/vpp/tenant/home'])).toBe('vpp');
    expect(getMicroProjectCodeFromRoutePath('', ['/vpp/tenant/home'])).toBe(
      'vpp',
    );
  });

  it('应在 fallback 路由中找到第一个匹配的微前端 projectCode', () => {
    expect(
      getMicroProjectCodeFromRoutePath('', ['/system/logs', '/zz/dashboard']),
    ).toBe('zz');
  });
});
