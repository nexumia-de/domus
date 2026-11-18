import { expect, test, vi } from 'vitest';
import {
  DEFAULT_ROUTE,
  hashFor,
  ROUTES,
  routeFromHash,
  startRouter,
  type RouterHost,
} from '../src/router';

test('every route round-trips through its hash', () => {
  for (const route of ROUTES) expect(routeFromHash(hashFor(route))).toBe(route);
  expect(ROUTES).toEqual(['ratios', 'components', 'dishes', 'settings']);
});

test('an empty or unknown hash is the default route, Ratios', () => {
  expect(DEFAULT_ROUTE).toBe('ratios');
  for (const hash of ['', '#', '#/', '#/nope', '#nope', '#/Ratios', '#/ratio']) {
    expect(routeFromHash(hash)).toBe('ratios');
  }
});

test('extra path or query after the route is ignored', () => {
  expect(routeFromHash('#/dishes/42')).toBe('dishes');
  expect(routeFromHash('#/settings?x=1')).toBe('settings');
  expect(routeFromHash('#components')).toBe('components');
});

const fakeHost = (hash: string) => {
  let listener = (): void => undefined;
  const host: RouterHost & { location: { hash: string } } = {
    location: { hash },
    history: {
      replaceState: vi.fn((_data: null, _unused: string, url: string) => {
        host.location.hash = url;
      }),
    },
    addEventListener: (_type, fn) => {
      listener = fn;
    },
  };
  return { host, fire: () => listener() };
};

test('the router reports the first route as initial and later ones as navigation', () => {
  const { host, fire } = fakeHost('#/dishes');
  const seen: string[] = [];
  startRouter(host, ({ route, initial }) => seen.push(`${route}:${initial}`));
  host.location.hash = '#/settings';
  fire();
  expect(seen).toEqual(['dishes:true', 'settings:false']);
  expect(host.history.replaceState).not.toHaveBeenCalled();
});

test('an unknown hash is rewritten without a new history entry', () => {
  const { host } = fakeHost('#/nope');
  const seen: string[] = [];
  startRouter(host, ({ route }) => seen.push(route));
  expect(seen).toEqual(['ratios']);
  expect(host.history.replaceState).toHaveBeenCalledWith(null, '', '#/ratios');
  expect(host.location.hash).toBe('#/ratios');
});
