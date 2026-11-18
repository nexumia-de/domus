import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import {
  SEED_TEMPLATES,
  checkRatio,
  resolveTemplate,
  saltFor,
  scaleFromAnchor,
  templateAncestors,
  templateChildren,
  templatePercent,
  templateSiblings,
} from '../src/index';
import type { EffectiveTemplate, RatioTemplate } from '../src/index';

const root: RatioTemplate = {
  id: 'root',
  name: 'root',
  source: 'user',
  anchor: 'flour',
  parts: [
    { role: 'flour', parts: 100 },
    { role: 'water', parts: 60, range: { min: 55, max: 65 } },
  ],
};
const child = (id: string, parentId: string, anchor?: string): RatioTemplate => ({
  id,
  name: id,
  source: 'user',
  parentId,
  changes: [{ op: 'add', role: id, parts: 1 }],
  ...(anchor ? { anchor } : {}),
});

const resolved = (templates: RatioTemplate[], id: string): EffectiveTemplate => {
  const r = resolveTemplate(templates, id);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.template;
};

describe('resolveTemplate', () => {
  test('does not change its input', () => {
    const templates = [root, child('c', 'root')];
    const before = JSON.stringify(templates);
    resolved(templates, 'c');
    expect(JSON.stringify(templates)).toBe(before);
  });
  test('a cycle is found from a template that only leads into it', () => {
    const r = resolveTemplate(
      [child('a', 'b'), child('b', 'c'), child('c', 'b'), child('d', 'a')],
      'd',
    );
    expect(r).toEqual({
      ok: false,
      error: { code: 'cycle', templateId: 'd', path: ['d', 'a', 'b', 'c', 'b'] },
    });
  });
  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('invalid parts %s', (parts) => {
    const bad = { ...root, parts: [{ role: 'flour', parts }] };
    expect(resolveTemplate([bad], 'root')).toMatchObject({ error: { code: 'invalid-parts' } });
    const add = { ...child('c', 'root'), changes: [{ op: 'add' as const, role: 'x', parts }] };
    expect(resolveTemplate([root, add], 'c')).toMatchObject({ error: { code: 'invalid-parts' } });
  });
  test.each([
    { min: -1, max: 2 },
    { min: 1, max: Number.NaN },
    { min: 0, max: Number.POSITIVE_INFINITY },
  ])('invalid range %j', (range) => {
    const bad = { ...root, parts: [{ role: 'flour', parts: 1, range }] };
    expect(resolveTemplate([bad], 'root')).toMatchObject({ error: { code: 'invalid-range' } });
  });
  test('a root with changes and a template with neither are rejected', () => {
    const both = { ...root, changes: [{ op: 'remove' as const, role: 'water' }] };
    expect(resolveTemplate([both], 'root')).toMatchObject({
      error: { code: 'not-root-or-derivative' },
    });
    const neither = { id: 'n', name: 'n', source: 'user' };
    expect(resolveTemplate([neither], 'n')).toMatchObject({
      error: { code: 'not-root-or-derivative' },
    });
  });
  test('an anchor re-added by a later change is fine; a missing one is not', () => {
    const t = {
      ...child('c', 'root'),
      changes: [
        { op: 'remove' as const, role: 'flour' },
        { op: 'add' as const, role: 'flour', parts: 90 },
      ],
    };
    expect(resolved([root, t], 'c').parts.map((p) => p.role)).toEqual(['water', 'flour']);
  });
  test('the result carries no field that judges a recipe', () => {
    expect(JSON.stringify(resolved([root], 'root'))).not.toMatch(/wrong|invalid|fail|missing/i);
  });
});

describe('family', () => {
  const set = [root, child('a', 'root'), child('b', 'root'), child('c', 'a')];
  test('children, siblings and ancestors', () => {
    expect(templateChildren(set, 'root')).toEqual(['a', 'b']);
    expect(templateSiblings(set, 'b')).toEqual(['a']);
    expect(templateAncestors(set, 'c')).toEqual({ ok: true, ids: ['a', 'root'] });
    expect(templateChildren(set, 'zzz')).toEqual([]);
    expect(templateSiblings(set, 'zzz')).toEqual([]);
  });
});

const trimBoundTemplate = (): EffectiveTemplate => ({
  id: 'noisy',
  anchor: 'flour',
  lineage: ['noisy'],
  parts: [
    { role: 'flour', parts: 100 },
    { role: 'water', parts: 0.3, range: { min: 0.1 * 3, max: 0.3 } },
  ],
});

describe('checkRatio', () => {
  const t = resolved([root], 'root');
  test('amounts in different scales give the same parts', () => {
    const a = checkRatio(t, { flour: 500, water: 300 });
    const b = checkRatio(t, { flour: 5000, water: 3000 });
    expect(a).toEqual(b);
  });
  test('a value on a bound is within despite binary noise', () => {
    const r = checkRatio(t, { flour: 1000, water: 650 });
    expect(r.ok && r.roles[1]).toMatchObject({ position: 'within', distance: 0 });
    const b = trimBoundTemplate();
    expect(checkRatio(b, { flour: 100, water: 0.3 })).toMatchObject({
      roles: [{}, { position: 'within' }],
    });
  });
  test('errors about the input', () => {
    expect(checkRatio(t, { flour: Number.NaN })).toMatchObject({
      error: { code: 'invalid-value', role: 'flour' },
    });
    expect(checkRatio(t, { flour: Number.POSITIVE_INFINITY })).toMatchObject({
      error: { code: 'invalid-value' },
    });
    expect(
      checkRatio({ ...t, anchor: undefined } as EffectiveTemplate, { flour: 1 }),
    ).toMatchObject({ error: { code: 'no-anchor' } });
  });
  test('no field or message says the recipe is wrong', () => {
    const results = [checkRatio(t, { flour: 100, water: 99, x: 5 }), checkRatio(t, { water: 5 })];
    expect(JSON.stringify(results)).not.toMatch(
      /wrong|invalid recipe|failed|error in recipe|missing/i,
    );
  });
  test('no NaN anywhere', () => {
    const r = checkRatio(t, { flour: 1e-300, water: 1e300 });
    expect(r).toEqual({ ok: false, error: { code: 'invalid-value', role: 'water' } });
  });
});

describe('scaleFromAnchor and templatePercent', () => {
  const t = resolved([root], 'root');
  test('scaling and percentages', () => {
    expect(scaleFromAnchor(t, 'water', 30)).toEqual({ ok: true, g: { flour: 50, water: 30 } });
    expect(scaleFromAnchor(t, 'water', Number.NaN)).toMatchObject({
      error: { code: 'invalid-value' },
    });
    expect(templatePercent(t)).toEqual({ ok: true, pct: { flour: 100, water: 60 } });
  });
});

describe('saltFor', () => {
  test.each([Number.NaN, Number.POSITIVE_INFINITY])('pct %s is out of range', (pct) => {
    expect(saltFor({ basis: 'food', pct, foodG: 100 })).toEqual({
      ok: false,
      error: { code: 'pct-out-of-range' },
    });
  });
  test('masses that are not finite are invalid', () => {
    expect(saltFor({ basis: 'water', pct: 2, waterG: Number.NaN })).toEqual({
      ok: false,
      error: { code: 'invalid-value' },
    });
  });
  test('the brine percentage of the result is the one asked for', () => {
    const r = saltFor({ basis: 'brine', pct: 7.5, waterG: 1234 });
    expect(r.ok && (100 * r.saltG) / r.totalG).toBeCloseTo(7.5, 9);
  });
});

describe('seed templates', () => {
  const dir = fileURLToPath(new URL('../schemas/', import.meta.url));
  const read = (path: string): object => JSON.parse(readFileSync(path, 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.schema.json')))
    ajv.addSchema(read(dir + f));
  const validate = ajv.getSchema((read(`${dir}template.schema.json`) as { $id: string }).$id);

  test('there are seed templates and their ids are unique', () => {
    expect(SEED_TEMPLATES.length).toBeGreaterThan(0);
    const ids = SEED_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test.each(SEED_TEMPLATES.map((t) => [t.id, t] as const))('%s', (id, template) => {
    expect(validate?.(template), JSON.stringify(validate?.errors)).toBe(true);
    expect(template.source.startsWith('docs/ratios.md#')).toBe(true);
    expect(resolveTemplate(SEED_TEMPLATES, id).ok).toBe(true);
  });
});
