/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any -- vector files are untyped JSON read by the test */
// Runs every template vector and pins what is not a number: the six
// templates validate against the schema and agree with docs/balance.md,
// results are deterministic and carry no verdict words.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  buildTree,
  checkRange,
  matchSpec,
  ROOT_TEMPLATES,
  type Figure,
  type Ingredient,
  type MatchLine,
  type RangeInput,
  type Template,
} from '../src/index';
import { validate } from './helpers/json-schema';
import { makeAjv } from './schema-helpers';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = `${root}vectors/templates/`;
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const vectorSchema = read(`${dir}templates-vector.schema.json`);
const built = buildTree(read(`${dir}tree.json`).ingredients as Ingredient[]);
if (!built.ok) throw new Error('tree.json is invalid');
const tree = built.tree;
const files = readdirSync(dir).filter(
  (f) => f.endsWith('.json') && /^[a-z]/.test(f) && f !== 'tree.json' && !f.includes('schema'),
);
const vectors = files.map((f) => ({ file: f, v: read(`${dir}${f}`) }));
const VERDICTS = ['good', 'bad', 'wrong', 'balanced', 'verdict', 'ideal', 'perfect', 'correct'];

describe('the six root templates', () => {
  const ajv = makeAjv();
  const check = ajv.getSchema('urn:mixtura:template')!;
  const files6 = readdirSync(`${root}data/templates`).sort();

  test('six files, one per template, in the practice order', () => {
    expect(files6).toEqual([
      'daiquiri.json',
      'flip.json',
      'highball.json',
      'martini.json',
      'old-fashioned.json',
      'sidecar.json',
    ]);
    expect(ROOT_TEMPLATES.map((t) => t.id)).toEqual([
      'old-fashioned',
      'martini',
      'daiquiri',
      'sidecar',
      'highball',
      'flip',
    ]);
  });

  test.each(files6)('%s validates against the Template schema', (f) => {
    const t = read(`${root}data/templates/${f}`);
    expect(check(t), JSON.stringify(check.errors)).toBe(true);
    expect(`${t.id}.json`).toBe(f);
    const ids = t.slots.map((s: { id: string }) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of t.slots) expect(s.minParts).toBeLessThanOrEqual(s.maxParts);
    for (const r of Object.values(t.usual) as ({ min: number; max: number } | string)[]) {
      if (typeof r !== 'string') expect(r.min).toBeLessThanOrEqual(r.max);
    }
    if (t.parentId) expect(ROOT_TEMPLATES.some((x) => x.id === t.parentId)).toBe(true);
  });

  test('no number is marked verified: nothing was read from a primary source', () => {
    for (const t of ROOT_TEMPLATES) {
      expect(t.slotEvidence).toBe('assumption');
      expect(t.usual?.evidence).toBe('assumption');
      expect(t.source?.note).toContain('Assumption, unverified');
    }
  });

  test('the usual ranges are the rows of the table in docs/balance.md', () => {
    const doc = readFileSync(`${root}../../docs/balance.md`, 'utf8');
    const rows = doc
      .split('\n')
      .filter((l) => /^\| (Old-Fashioned|Martini|Daiquiri|Sidecar|Highball|Flip) /.test(l));
    expect(rows.length).toBe(6);
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim());
      const t = ROOT_TEMPLATES.find((x) => x.name === cells[1])!;
      const nums = (c: string) => c.split('–').map((n) => Number(n.trim()));
      const want = { abv: nums(cells[4]!), sugar: nums(cells[5]!), acid: nums(cells[6]!) };
      // Highball: the document states 9.1 to 12.1 for 120 to 180 ml of mixer.
      if (t.id === 'highball') want.abv = [9.1, 12.1];
      for (const k of ['abv', 'sugar', 'acid'] as const) {
        const range = t.usual![k]!;
        const [lo, hi] = want[k].length === 1 ? [want[k][0]!, want[k][0]!] : want[k];
        expect([range.min, range.max], `${t.id} ${k}`).toEqual([lo, hi]);
      }
    }
  });
});

test('vectors validate against their schema and carry their file name as id', () => {
  expect(vectors.length).toBeGreaterThanOrEqual(30);
  for (const { file, v } of vectors) {
    expect(validate(vectorSchema, v), file).toEqual([]);
    expect(v.id).toBe(file.replace(/\.json$/, ''));
  }
});

test('every root template has a match, a near miss and range outcomes in the vectors', () => {
  const ids = vectors.map((x) => x.v.id as string);
  for (const t of ['old-fashioned', 'martini', 'daiquiri', 'sidecar', 'highball', 'flip']) {
    expect(
      ids.some((i) => i.startsWith('match-') && i.includes(t)),
      t,
    ).toBe(true);
    expect(ids.includes(`range-${t}`), t).toBe(true);
  }
  const statuses = new Set<string>();
  for (const { v } of vectors.filter((x) => x.v.kind === 'range'))
    for (const e of Object.values(v.expected) as { status: string }[]) statuses.add(e.status);
  expect([...statuses].sort()).toEqual(['above', 'below', 'unknown', 'within']);
});

const figureOf = (x: number | { unknown: string[] }): Figure =>
  typeof x === 'number'
    ? { known: true, value: x }
    : { known: false, missingIds: x.unknown, reason: 'unknown in the vector' };

describe.each(vectors.filter((x) => x.v.kind === 'match'))('$v.id', ({ v }) => {
  const templates: Template[] = v.templates ?? ROOT_TEMPLATES;
  const spec = { templateId: v.templateId, lines: v.lines as MatchLine[] };
  const result = matchSpec(tree, templates, spec);
  const e = v.expected;

  test('chosen', () => {
    if ('chosen' in e) expect(result.chosen ?? null).toEqual(e.chosen);
  });

  test('order starts with the listed ids', () => {
    if (e.order)
      expect(result.candidates.map((c) => c.templateId).slice(0, e.order.length)).toEqual(e.order);
    if (e.order && e.order.length === 0) expect(result.candidates).toEqual([]);
  });

  test('candidates', () => {
    for (const [id, want] of Object.entries(e.candidates ?? {}) as [
      string,
      Record<string, any>,
    ][]) {
      const c = result.candidates.find((x) => x.templateId === id)!;
      expect(c, id).toBeDefined();
      expect(c.fits).toBe(want.fits);
      if (want.distance !== undefined)
        expect(Math.abs(c.distance - want.distance)).toBeLessThan(1e-5);
      if (want.emptyRequired) expect(c.assignment.emptyRequired).toEqual(want.emptyRequired);
      if (want.unassigned)
        expect(c.assignment.unassigned.map((u) => ({ index: u.index, reason: u.reason }))).toEqual(
          want.unassigned,
        );
      for (const [slot, status] of Object.entries(want.ratios ?? {}))
        expect(c.ratios.find((r) => r.slotId === slot)?.status, `${id}/${slot}`).toBe(status);
    }
  });

  test('deterministic: the same input and a reversed template list give the same order', () => {
    const again = matchSpec(tree, templates, spec);
    expect(again).toEqual(result);
    if (spec.templateId === undefined) {
      const rev = matchSpec(tree, [...templates].reverse(), spec);
      expect(rev.candidates.map((c) => c.templateId)).toEqual(
        result.candidates.map((c) => c.templateId),
      );
      expect(rev.chosen).toEqual(result.chosen);
    }
  });

  test('output carries no verdict words', () => {
    const text = JSON.stringify(result).toLowerCase();
    for (const w of VERDICTS) expect(text).not.toContain(w);
  });
});

describe.each(vectors.filter((x) => x.v.kind === 'range'))('$v.id', ({ v }) => {
  const template = [...ROOT_TEMPLATES, ...(v.templates ?? [])].find(
    (t: Template) => t.id === v.template,
  )!;
  const after: RangeInput | undefined = v.after
    ? {
        abvPct: figureOf(v.after.abvPct),
        sugarPer100Ml: figureOf(v.after.sugarPer100Ml),
        acidPct: figureOf(v.after.acidPct),
      }
    : undefined;
  const out = checkRange(template, after);

  test('statuses, ranges and unknown ids', () => {
    expect(out.map((o) => o.figure)).toEqual(['abv', 'sugar', 'acid']);
    for (const o of out.filter((x) => v.expected[x.figure])) {
      const want = v.expected[o.figure];
      expect(o.status, o.figure).toBe(want.status);
      expect(o.range ? [o.range.min, o.range.max] : undefined).toEqual(want.range);
      if (want.missingIds) expect(o.missingIds).toEqual(want.missingIds);
      if (o.status === 'unknown') expect(o.reason).toBeTypeOf('string');
      if (o.range) {
        expect(o.evidence).toBe('assumption');
        expect(o.sourceName).toContain('docs/balance.md');
      } else expect(o.evidence).toBeUndefined();
    }
  });

  test('output has no verdict field and no verdict words', () => {
    for (const o of out)
      expect(
        Object.keys(o).filter(
          (k) =>
            ![
              'figure',
              'status',
              'value',
              'range',
              'evidence',
              'sourceName',
              'reason',
              'missingIds',
            ].includes(k),
        ),
      ).toEqual([]);
    const text = JSON.stringify(out).toLowerCase();
    for (const w of VERDICTS) expect(text).not.toContain(w);
  });
});

test('no verdict words in the template code, data, vectors or document', () => {
  const sources = [
    ...readdirSync(`${root}src/templates`).map((f) => `${root}src/templates/${f}`),
    ...readdirSync(`${root}data/templates`).map((f) => `${root}data/templates/${f}`),
    ...readdirSync(dir).map((f) => `${dir}${f}`),
    `${root}../../docs/templates.md`,
  ];
  for (const f of sources) {
    const text = readFileSync(f, 'utf8').toLowerCase();
    for (const w of VERDICTS) expect(text, `${f}: ${w}`).not.toMatch(new RegExp(`\\b${w}\\b`));
  }
});
