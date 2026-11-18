import { expect, test } from 'vitest';
import { persistenceState, requestPersistence, storageEstimate } from '../src/store';
import { strings } from '../src/strings';

const api = (persisted: boolean, grants: boolean) => ({
  persisted: async () => persisted,
  persist: async () => grants,
  estimate: async () => ({ usage: 10, quota: 100 }),
});

test('the state is read without asking', async () => {
  expect(await persistenceState(api(true, false))).toBe('persistent');
  expect(await persistenceState(api(false, true))).toBe('best-effort');
  expect(await persistenceState(undefined)).toBe('unsupported');
  expect(await persistenceState({})).toBe('unsupported');
});

test('requesting persistence reports what the browser answered', async () => {
  expect(await requestPersistence(api(false, true))).toBe('persistent');
  expect(await requestPersistence(api(false, false))).toBe('best-effort');
  expect(await requestPersistence(api(true, false))).toBe('persistent');
  expect(await requestPersistence({ persisted: async () => false })).toBe('unsupported');
  const throwing = {
    persisted: async () => {
      throw new Error('x');
    },
  };
  expect(await persistenceState(throwing)).toBe('unsupported');
});

test('the estimate is optional', async () => {
  expect(await storageEstimate(api(false, false))).toEqual({ usage: 10, quota: 100 });
  expect(await storageEstimate({})).toBeNull();
});

test('Settings has one text for each state', () => {
  expect(strings.settings.storagePersistent).toBe('Storage: kept by the browser');
  expect(strings.settings.storageBestEffort).toContain('may clear it');
  expect(strings.settings.storageUnsupported).toContain('not reported');
});
