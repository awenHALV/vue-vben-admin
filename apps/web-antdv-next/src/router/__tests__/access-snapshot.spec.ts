import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccessSnapshotTarget } from '../access-snapshot';

import {
  clearAccessSnapshot,
  persistAccessSnapshot,
  restoreAccessSnapshot,
} from '../access-snapshot';

function createTarget(accessToken: null | string): AccessSnapshotTarget {
  return {
    accessToken,
    setAccessCodes: vi.fn(),
    setAccessMenus: vi.fn(),
    setMenuPathToDirectButtonCodes: vi.fn(),
  };
}

describe('access snapshot', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearAccessSnapshot();
  });

  it('restores a matching snapshot into the access target', () => {
    persistAccessSnapshot({
      accessCodes: ['tenant:view'],
      accessMenus: [
        {
          meta: {
            title: '租户首页',
          },
          name: 'tenant-home',
          path: '/vpp/tenant/home',
        },
      ],
      accessToken: 'token-1',
      menuPathToDirectButtonCodes: {
        '/vpp/tenant/home': ['tenant:refresh'],
      },
    });

    const target = createTarget('token-1');

    expect(restoreAccessSnapshot(target)).toBe(true);
    expect(target.setAccessCodes).toHaveBeenCalledWith(['tenant:view']);
    expect(target.setAccessMenus).toHaveBeenCalledWith([
      {
        meta: {
          title: '租户首页',
        },
        name: 'tenant-home',
        path: '/vpp/tenant/home',
      },
    ]);
    expect(target.setMenuPathToDirectButtonCodes).toHaveBeenCalledWith({
      '/vpp/tenant/home': ['tenant:refresh'],
    });
  });

  it('rejects a snapshot from a different token', () => {
    persistAccessSnapshot({
      accessCodes: ['tenant:view'],
      accessMenus: [],
      accessToken: 'token-old',
      menuPathToDirectButtonCodes: {},
    });

    const target = createTarget('token-new');

    expect(restoreAccessSnapshot(target)).toBe(false);
    expect(target.setAccessCodes).not.toHaveBeenCalled();
    expect(target.setAccessMenus).not.toHaveBeenCalled();
  });

  it('clears the snapshot when the current session has no token', () => {
    persistAccessSnapshot({
      accessCodes: ['tenant:view'],
      accessMenus: [],
      accessToken: 'token-old',
      menuPathToDirectButtonCodes: {},
    });

    const target = createTarget(null);

    expect(restoreAccessSnapshot(target)).toBe(false);

    const nextTarget = createTarget('token-old');
    expect(restoreAccessSnapshot(nextTarget)).toBe(false);
  });
});
