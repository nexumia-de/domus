// The shipped components in the Components list (issue 44, point 4): one list of own and shipped
// components, the address of a shipped one, its read-only view with the dish's amounts, and Keep,
// which makes own records and refuses a component with a wanted line. The classics are the
// fictional example file; the store is the in-memory one (fake-indexeddb), no browser.
import { beforeEach, describe, expect, test } from 'vitest';
import type { Classic } from '@culina/engine';
import { dishView } from '../src/classics/dish-view';
import { keepShippedComponent } from '../src/classics/keep';
import { componentRows } from '../src/components/list';
import { notebookGroups } from '../src/shared/notebook-rows';
import {
  parseShippedKey,
  shippedEntries,
  shippedKey,
  shippedView,
} from '../src/components/shipped';
import { getComponent, listComponents, listDishes, startNotebook } from '../src/notebook';
import type { ComponentRecord } from '../src/records';
import { actionFromHash, hashFor, paramFromHash, routeFromHash } from '../src/router';
import {
  EXAMPLE_CLASSICS,
  EXAMPLE_TECHNIQUES,
  NAMES,
  PAN_DISH,
  SECOND_DISH,
} from './classics-fixture';
import { must } from './must';
import { freshFactory } from './store-helpers';

const NOW = '2026-11-22T08:00:00.000Z';
const OWN_ID = 'u-0b0e7c1a-5d6e-4f70-8a9b-0c1d2e3f4a5b';

/** The pan dish with a second component whose first line names the sauce. */
const WITH_SUB: Classic = {
  ...PAN_DISH,
  components: [
    ...(PAN_DISH.components ?? []),
    {
      id: 'example-plate',
      name: { en: 'Example plate', de: 'Beispielteller' },
      lines: [
        { ref: { kind: 'component', id: 'example-sauce' }, amount: { value: 100, unit: 'g' } },
        { ref: { kind: 'ingredient', id: 'fdc-173410' }, amount: { value: 40, unit: 'g' } },
      ],
    },
  ],
};

const view = (classic: Classic, id: string, portions = 2) => {
  const shown = shippedView(classic, id, portions, 'en', NAMES, EXAMPLE_TECHNIQUES, new Set());
  if (!shown.ok) throw new Error(shown.code);
  return shown.view;
};

describe('the address of a shipped component', () => {
  test('is the classic id and the component id joined by a dot, under #/components', () => {
    const key = shippedKey('example-pan-dish', 'example-sauce');
    const hash = hashFor('components', key);
    expect(hash).toBe('#/components/example-pan-dish.example-sauce');
    expect(routeFromHash(hash)).toBe('components');
    expect(paramFromHash(hash)).toBe(key);
    expect(actionFromHash(hash)).toBeUndefined();
    expect(parseShippedKey(key)).toEqual({
      classicId: 'example-pan-dish',
      componentId: 'example-sauce',
    });
  });

  test('never meets an own id or a word of the router', () => {
    expect(parseShippedKey(OWN_ID)).toBeUndefined();
    expect(parseShippedKey('new')).toBeUndefined();
    expect(parseShippedKey('a.b.c')).toBeUndefined();
    expect(parseShippedKey('A.b')).toBeUndefined();
    expect(parseShippedKey('.b')).toBeUndefined();
  });
});

describe('the one list', () => {
  const own = {
    id: OWN_ID,
    name: 'My stock',
    role: 'sauce',
    lines: [],
    version: { family: OWN_ID, date: '2026-11-22' },
  } as unknown as ComponentRecord;
  const rows = componentRows([own], shippedEntries(EXAMPLE_CLASSICS, 'en'));

  test('holds own and shipped components, a shipped one marked with its dish', () => {
    expect(rows.map((r) => [r.origin, r.id, r.name, r.meta])).toEqual([
      ['own', OWN_ID, 'My stock', 'Sauce'],
      [
        'shipped',
        'example-pan-dish.example-sauce',
        'Example sauce',
        'Sauce · Shipped · Example pan dish (fictional)',
      ],
      ['shipped', 'example-second-dish.example-broth', 'Example broth', expect.any(String)],
    ]);
    expect(rows[2]?.meta).toContain('Shipped');
  });

  test('a base lists its alternatives too: every component of the file', () => {
    const entries = shippedEntries([WITH_SUB], 'en');
    expect(entries.map((e) => e.componentId)).toEqual(['example-sauce', 'example-plate']);
  });

  test('the origin choice leaves a group out; the search finds a shipped one by its dish', () => {
    expect(notebookGroups(rows, 'own', '').shipped).toBeUndefined();
    expect(notebookGroups(rows, 'shipped', '').own).toBeUndefined();
    const both = notebookGroups(rows, undefined, 'second dish');
    expect(both.own).toEqual([]);
    expect(both.shipped?.map((r) => r.name)).toEqual(['Example broth']);
  });

  test('without shipped components there is only the notebook group', () => {
    expect(notebookGroups(componentRows([own], []), undefined, '')).toEqual({
      own: [expect.objectContaining({ id: OWN_ID })],
    });
  });
});

describe('the read-only view', () => {
  test('has the lines of the dish view for the same portions, from deriveClassic', () => {
    const dish = dishView(PAN_DISH, 4, 'en', NAMES);
    if (!dish.ok) throw new Error(dish.code);
    const shown = view(PAN_DISH, 'example-sauce', 4);
    expect(shown.lines).toEqual(dish.view.components[0]?.lines);
    expect(shown.portions).toBe(4);
    expect(shown.dishName).toBe('Example pan dish (fictional)');
    expect(shown.source.source).toMatchObject({ author: 'Example Author' });
    // The source's 4 persons: as written at 4 portions, twice at 8; a line without an amount stays so.
    expect(shown.lines.map((l) => l.amount ?? l.amountWord)).toEqual([
      '200 g',
      '200 ml to 300 ml',
      'to taste',
    ]);
    expect(view(PAN_DISH, 'example-sauce', 8).lines.map((l) => l.amount)).toEqual([
      '400 g',
      '400 ml to 600 ml',
      undefined,
    ]);
    // The source section keeps only this component's remarks.
    expect(shown.source.sourceRemarks.lines.map((l) => l.original ?? l.remark)).toEqual([
      '2 Example-measures',
      'Invented example: the source says to taste.',
    ]);
  });

  test('has its own steps numbered from 1, and only its own', () => {
    const steps = view(WITH_SUB, 'example-sauce').steps;
    expect(steps.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(view(WITH_SUB, 'example-plate').steps).toEqual([]);
  });

  test('links a line that names another shipped component', () => {
    const shown = view(WITH_SUB, 'example-plate');
    expect(shown.links).toEqual(['example-pan-dish.example-sauce', undefined]);
    expect(shown.lines[0]?.name).toBe('Example sauce');
  });

  test('names a wanted ingredient, so it cannot be kept', () => {
    expect(view(SECOND_DISH, 'example-broth').wanted).toEqual(['Example broth stock']);
    expect(view(PAN_DISH, 'example-sauce').wanted).toEqual([]);
  });

  test('an id the dish does not have gives no view', () => {
    const shown = shippedView(PAN_DISH, 'nothing', 2, 'en', NAMES, [], new Set());
    expect(shown).toEqual({ ok: false, code: 'unknown-component' });
  });
});

describe('Keep in my notebook', () => {
  beforeEach(async () => {
    await startNotebook({ indexedDB: freshFactory(), now: () => NOW });
  });

  test('makes version 1 of an own component, with its role and the components it names', async () => {
    const done = await keepShippedComponent(WITH_SUB, 'example-plate', 2, 'en');
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.componentId).toMatch(/^u-/);
    const plate = must(getComponent(done.componentId));
    expect(plate.name).toBe('Example plate');
    expect(plate.version.family).toBe(plate.id);
    const sauceRef = must(plate.lines[0]).ref;
    expect(sauceRef.kind).toBe('component');
    const sauce = must(getComponent(sauceRef.id));
    expect(sauce.name).toBe('Example sauce');
    expect(sauce.role).toBe('sauce');
    expect(listComponents().every((c) => c.id.startsWith('u-'))).toBe(true);
    expect(listComponents()).toHaveLength(2);
    expect(listDishes()).toEqual([]);
  });

  test('refuses a component with a wanted line and writes nothing', async () => {
    const done = await keepShippedComponent(SECOND_DISH, 'example-broth', 2, 'en');
    expect(done).toEqual({ ok: false, reason: 'wanted', names: ['Example broth stock'] });
    expect(listComponents()).toEqual([]);
  });
});
