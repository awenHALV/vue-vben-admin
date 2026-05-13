import type { MenuRecordRaw } from '@vben-core/typings';

const ACCESS_SNAPSHOT_VERSION = 1;
const ACCESS_SNAPSHOT_KEY = `${import.meta.env.VITE_APP_NAMESPACE}-access-snapshot-v${ACCESS_SNAPSHOT_VERSION}`;

interface AccessSnapshotPayload {
  accessCodes: string[];
  accessMenus: MenuRecordRaw[];
  accessToken: null | string;
  menuPathToDirectButtonCodes: Record<string, string[]>;
}

interface AccessSnapshotRecord extends AccessSnapshotPayload {
  savedAt: number;
  version: number;
}

export interface AccessSnapshotTarget extends AccessSnapshotPayload {
  setAccessCodes(codes: string[]): void;
  setAccessMenus(menus: MenuRecordRaw[]): void;
  setMenuPathToDirectButtonCodes(map: Record<string, string[]>): void;
}

function getSnapshotStorage(): null | Storage {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage;
}

function cloneMenuPathToDirectButtonCodes(
  map: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(map ?? {}).map(([path, codes]) => [path, [...codes]]),
  );
}

function parseAccessSnapshot(raw: null | string): AccessSnapshotRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const snapshot = JSON.parse(raw) as Partial<AccessSnapshotRecord>;
    if (
      snapshot.version !== ACCESS_SNAPSHOT_VERSION ||
      !Array.isArray(snapshot.accessCodes) ||
      !Array.isArray(snapshot.accessMenus) ||
      typeof snapshot.menuPathToDirectButtonCodes !== 'object' ||
      snapshot.menuPathToDirectButtonCodes === null ||
      typeof snapshot.savedAt !== 'number' ||
      (typeof snapshot.accessToken !== 'string' && snapshot.accessToken !== null)
    ) {
      return null;
    }

    return {
      accessCodes: [...snapshot.accessCodes],
      accessMenus: snapshot.accessMenus,
      accessToken: snapshot.accessToken,
      menuPathToDirectButtonCodes: cloneMenuPathToDirectButtonCodes(
        snapshot.menuPathToDirectButtonCodes,
      ),
      savedAt: snapshot.savedAt,
      version: snapshot.version,
    };
  } catch {
    return null;
  }
}

export function clearAccessSnapshot(): void {
  const storage = getSnapshotStorage();
  storage?.removeItem(ACCESS_SNAPSHOT_KEY);
}

export function persistAccessSnapshot(payload: AccessSnapshotPayload): void {
  const storage = getSnapshotStorage();
  if (!storage) {
    return;
  }

  if (!payload.accessToken) {
    clearAccessSnapshot();
    return;
  }

  const snapshot: AccessSnapshotRecord = {
    accessCodes: [...payload.accessCodes],
    accessMenus: payload.accessMenus,
    accessToken: payload.accessToken,
    menuPathToDirectButtonCodes: cloneMenuPathToDirectButtonCodes(
      payload.menuPathToDirectButtonCodes,
    ),
    savedAt: Date.now(),
    version: ACCESS_SNAPSHOT_VERSION,
  };

  storage.setItem(ACCESS_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function readAccessSnapshot(accessToken: null | string): AccessSnapshotRecord | null {
  if (!accessToken) {
    clearAccessSnapshot();
    return null;
  }

  const storage = getSnapshotStorage();
  if (!storage) {
    return null;
  }

  const snapshot = parseAccessSnapshot(storage.getItem(ACCESS_SNAPSHOT_KEY));
  if (!snapshot) {
    clearAccessSnapshot();
    return null;
  }

  if (snapshot.accessToken !== accessToken) {
    clearAccessSnapshot();
    return null;
  }

  return snapshot;
}

export function restoreAccessSnapshot(target: AccessSnapshotTarget): boolean {
  const snapshot = readAccessSnapshot(target.accessToken);
  if (!snapshot) {
    return false;
  }

  target.setAccessCodes([...snapshot.accessCodes]);
  target.setAccessMenus(snapshot.accessMenus);
  target.setMenuPathToDirectButtonCodes(
    cloneMenuPathToDirectButtonCodes(snapshot.menuPathToDirectButtonCodes),
  );
  return true;
}
