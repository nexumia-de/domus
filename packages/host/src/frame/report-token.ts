// Where a web app keeps the user's GitHub token for issue reports: the page's localStorage,
// under one key shared by all apps on the address (they report to the same repository). A
// browser has no keyring; this is the same device-local place the apps keep their settings in
// (docs/feedback.md#the-token-in-the-browser). Every access may throw (private mode, blocked
// storage); then nothing is kept and the dialog works without a saved token.

export const TOKEN_KEY = 'domus.feedback.github-token';

export interface TokenStore {
  get(): string | undefined;
  set(token: string): void;
  clear(): void;
}

/** A token store on `storage` (default `localStorage`); `null` keeps nothing. */
export function browserTokenStore(storage?: Storage | null): TokenStore {
  const store = (): Storage | null => {
    if (storage !== undefined) return storage;
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  };
  return {
    get() {
      try {
        const value = store()?.getItem(TOKEN_KEY);
        return value === null || value === undefined || value === '' ? undefined : value;
      } catch {
        return undefined;
      }
    },
    set(token) {
      try {
        store()?.setItem(TOKEN_KEY, token);
      } catch {
        // Not kept: the next report asks for the token again.
      }
    },
    clear() {
      try {
        store()?.removeItem(TOKEN_KEY);
      } catch {
        // Nothing to remove where nothing could be kept.
      }
    },
  };
}
