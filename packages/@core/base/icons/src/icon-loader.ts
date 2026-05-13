type IconLoader = (iconName: string) => Promise<void> | void;

const iconLoaders = new Map<string, IconLoader>();

function parseIconName(icon: string) {
  const separatorIndex = icon.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex >= icon.length - 1) {
    return null;
  }

  return {
    iconName: icon.slice(separatorIndex + 1),
    prefix: icon.slice(0, separatorIndex),
  };
}

function registerIconLoader(prefix: string, loader: IconLoader) {
  iconLoaders.set(prefix, loader);
}

async function ensureIconRegistered(icon: unknown) {
  if (typeof icon !== 'string') {
    return;
  }

  const parsed = parseIconName(icon);
  if (!parsed) {
    return;
  }

  await iconLoaders.get(parsed.prefix)?.(parsed.iconName);
}

export { ensureIconRegistered, registerIconLoader };