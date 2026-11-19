// The role table: every entry names a catalogue ingredient and gives a role a ratio card or a dish
// knows; the roles reach the entries (and, by the tree, every food below a group), and a ratio card
// is then makeable from stock that names catalogue foods.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DISH_ROLES, makeable, SEED_TEMPLATES } from '@culina/engine';
import { expect, test } from 'vitest';
import { readCatalogue } from '../src/catalogue/load';
import { ROLE_TABLE, withRoles } from '../src/catalogue/roles';
import { must } from './must';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: { id: string; parentId?: string }[] };
const entries = must(
  readCatalogue({
    format: 'culina-ingredient-catalogue',
    formatVersion: 1,
    ingredients: file.ingredients,
  }),
);
const byId = new Map(entries.map((e) => [e.id, e]));

const KNOWN = new Set([
  ...SEED_TEMPLATES.flatMap((t) => (t.parts ?? []).map((p) => p.role)),
  ...DEFAULT_DISH_ROLES,
]);

test('every entry names a catalogue ingredient, a known role and its basis', () => {
  const ids = ROLE_TABLE.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const e of ROLE_TABLE) {
    expect(byId.has(e.id), `${e.id} is not in the catalogue`).toBe(true);
    expect(e.roles.length).toBeGreaterThan(0);
    for (const r of e.roles) expect(KNOWN.has(r), `${e.id}: unknown role ${r}`).toBe(true);
    expect(e.basis.trim().length).toBeGreaterThan(10);
  }
});

test('a read catalogue carries the roles; an entry that has its own keeps them', () => {
  expect(byId.get('fdc-group-butter')?.roles).toEqual(['fat']);
  const own = { id: 'fdc-group-butter', name: 'Butter', roles: ['garnish'] };
  expect(withRoles([own as never])[0]?.roles).toEqual(['garnish']);
});

test('a ratio card is makeable from stock that names catalogue foods', () => {
  const butter = must(entries.find((e) => e.parentId === 'fdc-group-butter'));
  const flour = must(
    entries.find(
      (e) =>
        e.parentId === 'fdc-group-wheat-flour' || e.parentId?.startsWith('fdc-group-wheat-flour-'),
    ),
  );
  const result = makeable({
    ingredients: entries.map((e) => ({
      id: e.id,
      ...(e.parentId === undefined ? {} : { parentId: e.parentId }),
      ...(e.roles === undefined ? {} : { roles: e.roles }),
    })),
    templates: SEED_TEMPLATES.filter((t) => t.id === 'roux'),
    stock: [
      { id: 's1', ref: { kind: 'ingredient', id: butter.id } },
      { id: 's2', ref: { kind: 'ingredient', id: flour.id } },
    ],
    today: '2026-11-18',
  });
  expect(result.ok && result.candidates.map((c) => [c.id, c.complete])).toEqual([['roux', true]]);
});
