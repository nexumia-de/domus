import { expect, test, vi } from 'vitest';
import { initialState } from '../src/app-state';
import { defaultPrefs, parsePrefs } from '../src/prefs';
import { createStore } from '../src/state';

test('set merges the patch and notifies with the previous state', () => {
  const store = createStore({ a: 1, b: 'x' });
  const listener = vi.fn();
  store.subscribe(listener);
  store.set({ a: 2 });
  expect(store.get()).toEqual({ a: 2, b: 'x' });
  expect(listener).toHaveBeenCalledWith({ a: 2, b: 'x' }, { a: 1, b: 'x' });
});

test('an unchanged patch does not notify', () => {
  const store = createStore({ a: 1 });
  const listener = vi.fn();
  store.subscribe(listener);
  store.set({ a: 1 });
  store.set({});
  expect(listener).not.toHaveBeenCalled();
});

test('unsubscribe stops notifications', () => {
  const store = createStore({ a: 1 });
  const listener = vi.fn();
  const stop = store.subscribe(listener);
  stop();
  store.set({ a: 2 });
  expect(listener).not.toHaveBeenCalled();
});

test('the app state starts from the URL and the preferences', () => {
  const state = initialState('#/stock?q=gin', { theme: 'dark', units: 'us' });
  expect(state.route.path).toEqual(['stock']);
  expect(state.theme).toBe('dark');
  expect(state.update).toBe('none');
  expect(state.lastRoute).toEqual({});
});

test('preferences fall back to the defaults for anything unreadable', () => {
  expect(parsePrefs(null)).toEqual(defaultPrefs);
  expect(parsePrefs('not json')).toEqual(defaultPrefs);
  expect(parsePrefs('{"theme":"neon","units":"us"}')).toEqual({ theme: 'system', units: 'us' });
  expect(parsePrefs('{"theme":"dark","units":"imperial"}')).toEqual({
    theme: 'dark',
    units: 'imperial',
  });
});
