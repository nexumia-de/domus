/** What the browser promises about keeping the data. */
export type PersistenceState = 'persistent' | 'best-effort' | 'unsupported';

interface StorageApi {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

const browserStorage = (): StorageApi | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.storage;

/** The current state, without asking for anything (Settings uses it). */
export const persistenceState = async (
  storage: StorageApi | undefined = browserStorage(),
): Promise<PersistenceState> => {
  try {
    if (!storage?.persisted) return 'unsupported';
    return (await storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unsupported';
  }
};

/**
 * Asks the browser to keep the data. Call it when the user first saves something. Browsers
 * may answer without a prompt; a refusal leaves `best-effort`.
 */
export const requestPersistence = async (
  storage: StorageApi | undefined = browserStorage(),
): Promise<PersistenceState> => {
  try {
    if (!storage?.persist) return 'unsupported';
    if (storage.persisted && (await storage.persisted())) return 'persistent';
    return (await storage.persist()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unsupported';
  }
};

/** Bytes used and available, when the browser reports them. */
export const storageEstimate = async (
  storage: StorageApi | undefined = browserStorage(),
): Promise<{ usage: number; quota: number } | null> => {
  try {
    const found = await storage?.estimate?.();
    if (found?.usage === undefined || found.quota === undefined) return null;
    return { usage: found.usage, quota: found.quota };
  } catch {
    return null;
  }
};
