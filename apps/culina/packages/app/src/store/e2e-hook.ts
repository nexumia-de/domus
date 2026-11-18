import { openStore } from './index';

/**
 * Test hook for the browser test: only loaded when the page URL has `?e2e-store`. It exposes
 * a second handle to the store as a promise on `globalThis.__culinaStore`, so the browser tests can read and write records directly.
 * Inert otherwise; it makes no network request.
 */
(globalThis as Record<string, unknown>).__culinaStore = openStore({
  now: () => new Date().toISOString(),
});
