// Invariants of the committed seed output (docs/seed-data.md): schemas, tree,
// references, attribution, no shipped prose, share of lines with missing
// properties below the thresholds recorded in the document.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { computeBalance, matchSpec, resolveProperty, ROOT_TEMPLATES, UNITS } from '../src/index';
import { makeAjv } from './schema-helpers';
import { curated, engineRoot, read, seed, seedDir, seedTree } from './seed-data';

const repo = `${engineRoot}../../`;
const pin = read(`${repo}scripts/seed/pinned.json`);
const doc = readFileSync(`${repo}docs/seed-data.md`, 'utf8');
const ajv = makeAjv();
const tree = seedTree();
const specs = seed.specs.specs;

describe('files', () => {
  test('every file carries the attribution of the pinned source', () => {
    for (const data of [seed.ingredients, seed.specs, seed.vocabulary]) {
      expect(data.attribution).toMatchObject({
        repository: pin.repository,
        commit: pin.commit,
        licence: pin.licence,
        holder: pin.holder,
      });
      expect(JSON.stringify(data.attribution)).toContain(pin.copyright);
    }
  });

  test('the licence text of the source is shipped with the copyright line', () => {
    const text = readFileSync(`${seedDir}LICENSE-bar-assistant.txt`, 'utf8');
    expect(text).toContain('MIT License');
    expect(text).toContain(pin.copyright);
  });

  test('records are sorted by id and every record names its source', () => {
    for (const list of [seed.ingredients.ingredients, specs]) {
      const ids = list.map((r) => r.id);
      expect(ids).toEqual([...ids].sort());
      for (const r of list)
        expect((r as { source?: { note?: string } }).source?.note).toContain(pin.commit);
    }
  });
});

describe('schemas and references', () => {
  test('ingredients and specs validate', () => {
    const ing = ajv.getSchema('urn:mixtura:ingredient');
    const spec = ajv.getSchema('urn:mixtura:spec');
    if (!ing || !spec) throw new Error('schema missing');
    for (const i of seed.ingredients.ingredients)
      expect(ing(i), `${i.id} ${JSON.stringify(ing.errors)}`).toBe(true);
    for (const s of specs) expect(spec(s), `${s.id} ${JSON.stringify(spec.errors)}`).toBe(true);
  });

  test('the tree has no cycle (seedTree throws on any tree error)', () => {
    expect(tree.ids.length).toBe(seed.ingredients.ingredients.length);
  });

  test('every spec line, substitute and parent resolves', () => {
    const specIds = new Set(specs.map((s) => s.id));
    for (const s of specs) {
      if (s.parentId) expect(specIds.has(s.parentId), `${s.id} parent`).toBe(true);
      for (const l of s.lines) {
        expect(tree.byId.has(l.ingredientId), `${s.id} ${l.ingredientId}`).toBe(true);
        for (const sub of l.substitutes ?? []) expect(tree.byId.has(sub.ingredientId)).toBe(true);
      }
    }
  });

  test('methods, glasses and templates exist', () => {
    const methods = new Set(seed.vocabulary.methods.map((m: { id: string }) => m.id));
    const glasses = new Set(seed.vocabulary.glasses.map((g: { id: string }) => g.id));
    const templates = new Set(ROOT_TEMPLATES.map((t) => t.id));
    for (const s of specs) {
      if (s.method) expect(methods.has(s.method), s.id).toBe(true);
      if (s.glass) expect(glasses.has(s.glass), s.id).toBe(true);
      if (s.templateId) expect(templates.has(s.templateId), s.id).toBe(true);
    }
  });

  test('no recipe text is shipped', () => {
    const allowed = new Set([
      'id',
      'lineageId',
      'version',
      'parentId',
      'name',
      'templateId',
      'lines',
      'method',
      'glass',
      'tags',
      'status',
      'source',
    ]);
    for (const s of specs) {
      for (const k of Object.keys(s)) expect(allowed.has(k), `${s.id} ${k}`).toBe(true);
      for (const l of s.lines) {
        expect(
          Object.keys(l).every((k) =>
            ['ingredientId', 'amount', 'amountMax', 'unit', 'optional', 'substitutes'].includes(k),
          ),
        ).toBe(true);
      }
    }
    for (const i of seed.ingredients.ingredients) expect(i).not.toHaveProperty('notes');
  });

  test('the template of a spec is the engine suggestion for its lines without optional ones', () => {
    for (const s of specs) {
      const lines = s.lines.filter((l) => !l.optional);
      const r = matchSpec(tree, ROOT_TEMPLATES, { lines });
      expect(r.chosen?.templateId, s.id).toBe(s.templateId);
    }
  });
});

describe('counted lines', () => {
  const table = new Map<string, string>(UNITS.map((u) => [u.id, u.kind]));

  test('the seed holds counted lines, each with a counted unit of the table', () => {
    const counted = specs.flatMap((s) => s.lines.filter((l) => table.get(l.unit) === 'count'));
    expect(counted.length).toBeGreaterThan(100);
  });

  test('no per-unit volume is in the seed: none was read from a source', () => {
    for (const i of seed.ingredients.ingredients) expect(i).not.toHaveProperty('unitVolumes');
  });

  test('balance lists every counted line as not counted and still gives figures', () => {
    const s = specs.find((x) => x.lines.some((l) => table.get(l.unit) === 'count' && !l.optional));
    expect(s).toBeDefined();
    const r = computeBalance(tree, { method: s?.method, lines: s?.lines ?? [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const reasons = new Set(r.value.excluded.map((e) => e.reason));
    expect(reasons.has('counted-without-volume')).toBe(true);
    expect(r.value.before.volumeMl).toBeGreaterThan(0);
  });
});

describe('missing properties', () => {
  const limits = Object.fromEntries(
    [...doc.matchAll(/Threshold (role|abv|sugar): (\d+(?:\.\d+)?) %/g)].map((m) => [
      m[1],
      Number(m[2]),
    ]),
  );
  const lines = specs.flatMap((s) => s.lines.filter((l) => !l.optional));
  const share = (p: 'role' | 'abv' | 'sugar' | 'acid') =>
    (100 *
      lines.filter((l) => resolveProperty(tree, l.ingredientId, p).value === undefined).length) /
    lines.length;

  test('the document sets a threshold for role, abv and sugar', () => {
    expect(Object.keys(limits).sort()).toEqual(['abv', 'role', 'sugar']);
  });

  test.each(['role', 'abv', 'sugar'] as const)(
    'share of lines without %s is below the threshold',
    (p) => {
      expect(share(p)).toBeLessThanOrEqual(limits[p] as number);
    },
  );

  test('acid is unknown on every line: no value was read from a source', () => {
    expect(share('acid')).toBe(100);
  });
});

describe('curated file', () => {
  test('validates and every entry names a source or is an assumption', () => {
    const check = ajv.compile(read(`${engineRoot}data/ingredient-properties.schema.json`));
    expect(check(curated), JSON.stringify(check.errors)).toBe(true);
  });

  test('every role entry names an ingredient of the seed', () => {
    for (const id of Object.keys(curated.roles)) expect(tree.byId.has(id), id).toBe(true);
    for (const id of Object.keys(curated.classics)) expect(tree.byId.has(id), id).toBe(true);
  });

  test('the seed has no acid value and marks assumed roles', () => {
    for (const i of seed.ingredients.ingredients) {
      expect(i.acid).toBeUndefined();
      if (i.role) expect(i.assumed).toContain('role');
    }
  });

  test('the licence file exists', () => {
    expect(existsSync(`${seedDir}LICENSE-bar-assistant.txt`)).toBe(true);
  });
});
