// Centralized lookup for UI and gameplay assets used across the client.
// The registry eagerly loads everything under src/assets so feature code can reference
// logical keys like "icons/sword.svg" without worrying about relative paths.
const assetModules = import.meta.glob<{ default: string }>(
  './assets/**/*',
  { eager: true }
);

// The normalized map uses keys relative to src/assets (e.g. "icons/sword.svg").
const assetMap: Record<string, string> = Object.entries(assetModules).reduce(
  (map, [path, module]) => {
    const normalized = path
      .replace(/^\.\/assets\//, '')
      .replace(/^@assets\//, '');

    if (typeof module === 'string') {
      map[normalized] = module;
      return map;
    }

    // Vite returns the default export of static assets; guard in case a module slips through.
    if ('default' in (module as { default: string })) {
      map[normalized] = (module as { default: string }).default;
    }

    return map;
  },
  {} as Record<string, string>
);

// Normalizes user keys so the registry accepts inputs like "@assets/icons/sword.svg".
const normalizeKey = (key: string) =>
  key.replace(/^@assets\//, '').replace(/^\.\/assets\//, '');

export const getAsset = (key: string): string => {
  const normalized = normalizeKey(key);
  const asset = assetMap[normalized];

  if (!asset) {
    throw new Error(`Asset not found for key "${normalized}"`);
  }

  return asset;
};

export const hasAsset = (key: string): boolean => {
  const normalized = normalizeKey(key);
  return Object.hasOwn(assetMap, normalized);
};

export const listAssets = (prefix?: string): string[] => {
  const normalizedPrefix = prefix ? normalizeKey(prefix) : undefined;
  return Object.keys(assetMap).filter((entry) =>
    normalizedPrefix ? entry.startsWith(normalizedPrefix) : true
  );
};
