import { expect, test, vi } from 'vitest';
import {
  DEFAULT_ROUTE,
  paramFromHash,
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

test('a ratio card route carries the template id; other routes carry none', () => {
  expect(routeFromHash('#/ratios/pie-dough')).toBe('ratios');
  expect(paramFromHash('#/ratios/pie-dough')).toBe('pie-dough');
  expect(paramFromHash('#/ratios/pie%20dough?x=1')).toBe('pie dough');
  expect(paramFromHash('#/ratios/%E0%A4%A')).toBe('%E0%A4%A');
  expect(paramFromHash('#/ratios')).toBeUndefined();
  expect(paramFromHash('#/ratios/')).toBeUndefined();
  expect(paramFromHash('#/settings/42')).toBeUndefined();
  expect(hashFor('ratios', 'pie-dough')).toBe('#/ratios/pie-dough');
});

test('a card hash is kept as it is; a trailing slash is rewritten', () => {
  const kept = fakeHost('#/ratios/pasta-dough');
  const seen: string[] = [];
  startRouter(kept.host, ({ route, param }) => seen.push(`${route}:${param}`));
  expect(seen).toEqual(['ratios:pasta-dough']);
  expect(kept.host.history.replaceState).not.toHaveBeenCalled();
  const slash = fakeHost('#/ratios/');
  startRouter(slash.host, () => undefined);
  expect(slash.host.history.replaceState).toHaveBeenCalledWith(null, '', '#/ratios');
});

test('component and dish routes carry an id; unknown ids are the screens to handle', () => {
  expect(routeFromHash('#/components/example-pan-sauce')).toBe('components');
  expect(paramFromHash('#/components/example-pan-sauce')).toBe('example-pan-sauce');
  expect(paramFromHash('#/dishes/example-vegetable-plate?x=1')).toBe('example-vegetable-plate');
  expect(paramFromHash('#/components')).toBeUndefined();
  expect(paramFromHash('#/dishes/')).toBeUndefined();
  expect(paramFromHash('#/settings/x')).toBeUndefined();
  expect(hashFor('dishes', 'example-vegetable-plate')).toBe('#/dishes/example-vegetable-plate');
  expect(hashFor('components')).toBe('#/components');
});
