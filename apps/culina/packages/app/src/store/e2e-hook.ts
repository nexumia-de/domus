import { openStore } from './index';

/**
 * Test hook for the browser test: only loaded when the page URL has `?e2e-store`. It exposes
 * the opened store as a promise on `globalThis.__culinaStore`, because no screen writes yet.
 * Inert otherwise; it makes no network request.
 */
(globalThis as Record<string, unknown>).__culinaStore = openStore({
  now: () => new Date().toISOString(),
});
