// Pins the effective parts, ranges and anchors of every seed template, so a
// seed template can become a variation (docs/engine-rules.md#seed-templates)
// without changing a sourced figure.
import { describe, expect, test } from 'vitest';
import { resolveTemplate, SEED_TEMPLATES } from '../src/index';

type Row = readonly [role: string, parts: number, min?: number, max?: number];

/** id -> [anchor, effective parts in role order]; written from the roots-only seed. */
const PINNED: Record<string, readonly [string, readonly Row[]]> = {
  'bread-dough-ratio': [
    'flour',
    [
      ['flour', 5],
      ['water', 3],
    ],
  ],
  'pasta-dough': [
    'flour',
    [
      ['flour', 3],
      ['egg', 2],
    ],
  ],
  'pie-dough': [
    'flour',
    [
      ['flour', 3],
      ['fat', 2],
      ['water', 1],
    ],
  ],
  'cookie-dough': [
    'flour',
    [
      ['flour', 3],
      ['fat', 2],
      ['sugar', 1],
    ],
  ],
  'pound-cake': [
    'flour',
    [
      ['flour', 1],
      ['fat', 1],
      ['sugar', 1],
      ['egg', 1],
    ],
  ],
  vinaigrette: [
    'oil',
    [
      ['oil', 3],
      ['acid', 1],
    ],
  ],
  roux: [
    'flour',
    [
      ['flour', 3],
      ['fat', 2],
    ],
  ],
  'roux-whole-butter': [
    'flour',
    [
      ['flour', 1],
      ['fat', 1],
    ],
  ],
  'free-standing-custard': [
    'egg',
    [
      ['liquid', 2],
      ['egg', 1],
    ],
  ],
  'bread-dough-bakers-percent': [
    'flour',
    [
      ['flour', 100],
      ['water', 60],
      ['yeast', 3],
      ['salt', 2, 1.8, 2],
    ],
  ],
  'neapolitan-pizza-dough': [
    'flour',
    [
      ['flour', 100],
      ['water', 55.6],
      ['salt', 2.95, 2.8, 3.1],
    ],
  ],
  'ciabatta-stiff-biga': [
    'flour',
    [
      ['flour', 100],
      ['water', 73],
      ['salt', 2],
    ],
  ],
};

/** The variations of the seed and their parents; every other seed template is a root. */
const VARIATIONS: Record<string, string> = {
  'roux-whole-butter': 'roux',
  'bread-dough-bakers-percent': 'bread-dough-ratio',
};

describe('seed templates, effective values', () => {
  test('the pinned table covers exactly the seed', () => {
    expect(SEED_TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(PINNED).sort());
  });
  test.each(Object.entries(PINNED))('%s resolves to its sourced parts', (id, [anchor, rows]) => {
    const result = resolveTemplate(SEED_TEMPLATES, id);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.template.anchor).toBe(anchor);
    const actual = result.template.parts.map((p) => [
      p.role,
      p.parts,
      ...(p.range ? [p.range.min, p.range.max] : []),
    ]);
    expect(actual).toEqual(rows.map((r) => [...r]));
  });
  test('roots and variations of the seed', () => {
    const parents = Object.fromEntries(
      SEED_TEMPLATES.filter((t) => t.parentId !== undefined).map((t) => [t.id, t.parentId]),
    );
    expect(parents).toEqual(VARIATIONS);
  });
});
