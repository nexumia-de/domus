// The records the export and import checks fill in, and helpers to read the store and to hand
// the page files. The expected values come from the engine itself (notebook-fixture.mjs).
import { readFileSync } from 'node:fs';

export const uid = (n) => `u-00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
export const FLOUR = uid(1);
export const BUTTER = uid(2);
export const V1 = uid(10);
export const V2 = uid(11);
export const V3 = uid(12);
export const VAR = uid(13);
export const DISH = uid(20);
export const NOTE1 = uid(40);
export const NOTE2 = uid(41);

const g = (value) => ({ value, unit: 'g' });
const line = (id, amount, role) => ({
  ref: { kind: 'ingredient', id },
  amount,
  ...(role ? { role } : {}),
});

/** Own records: three versions, a variation of the second, a dish, stock, two tasting notes. */
export const OWN = {
  ingredients: [
    {
      id: FLOUR,
      name: 'Bread flour',
      roles: ['flour'],
      densityGPerMl: { value: 0.53, source: 'user' },
    },
    { id: BUTTER, name: 'Butter', unitWeightG: { value: 250, source: 'user' } },
  ],
  components: [
    {
      id: V1,
      name: 'Pan sauce',
      lines: [line(FLOUR, g(30), 'flour'), line(BUTTER, g(40))],
      version: { family: V1, date: '2026-11-01' },
    },
    {
      id: V2,
      name: 'Pan sauce',
      lines: [line(FLOUR, g(35), 'flour'), line(BUTTER, g(40))],
      version: {
        family: V1,
        parent: V1,
        date: '2026-11-05',
        change: 'More flour',
        reason: 'Thicker',
      },
    },
    {
      id: V3,
      name: 'Pan sauce',
      yield: { amount: g(70), source: 'user' },
      lines: [line(FLOUR, g(35), 'flour'), line(BUTTER, g(45))],
      version: { family: V1, parent: V2, date: '2026-11-09' },
    },
    {
      id: VAR,
      name: 'Brown pan sauce',
      lines: [line(BUTTER, g(45))],
      version: { family: VAR, parent: V2, date: '2026-11-12' },
    },
  ],
  dishes: [
    {
      id: DISH,
      name: 'Steak plate',
      slots: [{ role: 'sauce', ref: { kind: 'component', id: V1 } }],
      version: { family: DISH, date: '2026-11-10' },
    },
  ],
  stock: [{ id: uid(30), ref: { kind: 'ingredient', id: FLOUR }, amount: g(1000), state: 'raw' }],
  tastings: [
    { id: NOTE1, ref: { kind: 'component', id: V2 }, date: '2026-11-06', text: 'Thick enough' },
    { id: NOTE2, ref: { kind: 'component', id: V3 }, date: '2026-11-10', text: 'Glossy' },
  ],
};

export const KINDS = [
  'ingredients',
  'templates',
  'components',
  'dishes',
  'stock',
  'affinities',
  'tastings',
];

export const listStore = (page, kind) =>
  page.evaluate(async (k) => {
    const opened = await globalThis.__culinaStore;
    return (await opened.store.list(k)).records;
  }, kind);

/** Every live record of every kind, by kind, sorted by id. */
export const listAll = async (page) => {
  const out = {};
  for (const kind of KINDS) {
    out[kind] = [...(await listStore(page, kind))].sort((a, b) => (a.id < b.id ? -1 : 1));
  }
  return out;
};

export const putAll = (page, records) =>
  page.evaluate(async (all) => {
    const opened = await globalThis.__culinaStore;
    const results = [];
    for (const [kind, list] of Object.entries(all)) {
      for (const record of list) results.push(await opened.store.put(kind, record));
    }
    return results.every((r) => r.ok) ? 'ok' : JSON.stringify(results.filter((r) => !r.ok));
  }, records);

export const removeFromStore = (page, kind, id) =>
  page.evaluate(
    async ([k, i]) => {
      const opened = await globalThis.__culinaStore;
      return (await opened.store.remove(k, i)).ok;
    },
    [kind, id],
  );

/** A file as the page's file input takes it. */
export const file = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text) });
export const readDownload = async (download) => readFileSync(await download.path(), 'utf8');

export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
