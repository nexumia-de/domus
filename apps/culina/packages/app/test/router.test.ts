import { expect, test, vi } from 'vitest';
import {
  actionFromHash,
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
  // Start is gone (docs/decisions/cook-screen.md); the stock screens stay routes of their own under
  // Cook.
  expect(ROUTES).toEqual([
    'classics',
    'classic',
    'ratios',
    'components',
    'dishes',
    'cook',
    'stock',
    'settings',
  ]);
});

test('an empty or unknown hash is the default route, Cook; so is the old start screen', () => {
  expect(DEFAULT_ROUTE).toBe('cook');
  for (const hash of ['', '#', '#/', '#/nope', '#nope', '#/Ratios', '#/ratio', '#/start']) {
    expect(routeFromHash(hash)).toBe('cook');
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
  expect(seen).toEqual(['cook']);
  expect(host.history.replaceState).toHaveBeenCalledWith(null, '', '#/cook');
  expect(host.location.hash).toBe('#/cook');
});

test('the old start screen #/start opens Cook without a new history entry', () => {
  const { host } = fakeHost('#/start');
  const seen: string[] = [];
  startRouter(host, ({ route, param, action }) => seen.push(`${route}:${param}:${action}`));
  expect(seen).toEqual(['cook:undefined:undefined']);
  expect(host.history.replaceState).toHaveBeenCalledTimes(1);
  expect(host.history.replaceState).toHaveBeenCalledWith(null, '', '#/cook');
});

test('a redirected address is replaced without a new history entry, on load and on navigation', () => {
  const { host, fire } = fakeHost('#/classics/it');
  const seen: string[] = [];
  const asked: string[] = [];
  startRouter(
    host,
    ({ route, param, initial }) => seen.push(`${route}:${param}:${initial}`),
    (route, param) => {
      if (route !== 'classics') return undefined;
      asked.push(`${param}`);
      return '#/dishes';
    },
  );
  host.location.hash = '#/classics';
  fire();
  host.location.hash = '#/ratios';
  fire();
  expect(asked).toEqual(['it', 'undefined']);
  expect(seen).toEqual([
    'dishes:undefined:true',
    'dishes:undefined:false',
    'ratios:undefined:false',
  ]);
  expect(host.history.replaceState).toHaveBeenCalledTimes(2);
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

test('editor routes: new, and edit of an id; they round-trip and carry no id for new', () => {
  expect(actionFromHash('#/components/new')).toBe('new');
  expect(paramFromHash('#/components/new')).toBeUndefined();
  expect(actionFromHash('#/dishes/u-1/edit')).toBe('edit');
  expect(paramFromHash('#/dishes/u-1/edit')).toBe('u-1');
  expect(actionFromHash('#/components/u-1')).toBeUndefined();
  expect(actionFromHash('#/ratios/new')).toBeUndefined();
  expect(actionFromHash('#/components/u-1/other')).toBeUndefined();
  // An own component and an own dish are cooked step by step.
  expect(actionFromHash('#/components/u-1/cook')).toBe('cook');
  expect(actionFromHash('#/dishes/u-1/cook')).toBe('cook');
  expect(hashFor('components', 'u-1', 'cook')).toBe('#/components/u-1/cook');
  expect(hashFor('dishes', 'u-1', 'cook')).toBe('#/dishes/u-1/cook');
  // A ratio has nothing to cook.
  expect(actionFromHash('#/ratios/bread/cook')).toBeUndefined();
  // The random pick is a screen of the dishes; like `new`, the word is not an id.
  expect(actionFromHash('#/dishes/random')).toBe('random');
  expect(paramFromHash('#/dishes/random')).toBeUndefined();
  expect(hashFor('dishes', undefined, 'random')).toBe('#/dishes/random');
  // Components have no random pick: there the word is read as an id.
  expect(actionFromHash('#/components/random')).toBeUndefined();
  expect(paramFromHash('#/components/random')).toBe('random');
  expect(actionFromHash('#/dishes/random/edit')).toBe('edit');
  expect(hashFor('components', undefined, 'new')).toBe('#/components/new');
  expect(hashFor('dishes', 'u-1', 'edit')).toBe('#/dishes/u-1/edit');
  for (const hash of ['#/components/new', '#/dishes/u-1/edit', '#/dishes/random']) {
    const { host } = fakeHost(hash);
    const seen: string[] = [];
    startRouter(host, ({ route, param, action }) => seen.push(`${route}:${param}:${action}`));
    expect(host.history.replaceState).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
  }
  const stray = fakeHost('#/components/u-1/other');
  startRouter(stray.host, () => undefined);
  expect(stray.host.history.replaceState).toHaveBeenCalledWith(null, '', '#/components/u-1');
});
