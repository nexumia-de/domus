// Runs every vector in vectors/ratios/templates against the engine (docs/vectors.md).
// Mapping for `ratio_check`, `scale_anchor` and `template_percent`: the
// inline `template` has `parts` (role -> parts, in order), optional `ranges`
// (role -> min, max) and optional `anchor`; its id is its name. `lines` are
// `name`, `g`; `anchor` is the role to use (ratio_check) or the weighed role
// with its grams (scale_anchor).
import { describe, expect, test } from 'vitest';
import {
  checkRatio,
  resolveTemplate,
  scaleFromAnchor,
  templateAncestors,
  templateChildren,
  templatePercent,
  templateSiblings,
} from '../src/index';
import type { EffectiveTemplate, PartRange, RatioTemplate } from '../src/index';
import { expectError, loadVectors, nearRecord } from './vector-files';
import type { Vector } from './vector-files';

const vectors = loadVectors('ratios/templates');

interface InlineTemplate {
  name: string;
  anchor?: string;
  parts: Record<string, number>;
  ranges?: Record<string, PartRange>;
}

function effective(t: InlineTemplate): EffectiveTemplate {
  return {
    id: t.name,
    ...(t.anchor !== undefined ? { anchor: t.anchor } : {}),
    lineage: [t.name],
    parts: Object.entries(t.parts).map(([role, parts]) => ({
      role,
      parts,
      ...(t.ranges?.[role] ? { range: t.ranges[role] } : {}),
    })),
  };
}

type Expected = Record<string, Record<string, number> | string[] | string>;

function run(vector: Vector): void {
  const i = vector.inputs;
  const tol = vector.tolerance;
  const failing = vector.error_code !== undefined;
  const expected = (vector.expected ?? {}) as Expected;
  const record = (key: string) => expected[key] as Record<string, number>;
  switch (i.kind) {
    case 'resolve_template': {
      const result = resolveTemplate(i.templates as RatioTemplate[], i.id as string);
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      const t = result.template;
      expect(
        t.parts.map((p) => p.role),
        'roles',
      ).toEqual(expected.roles);
      nearRecord(
        Object.fromEntries(t.parts.map((p) => [p.role, p.parts])),
        record('parts'),
        tol,
        'parts',
      );
      expect(t.lineage, 'lineage').toEqual(expected.lineage);
      expect(t.anchor, 'anchor').toBe(expected.anchor);
      const ranges = Object.fromEntries(
        t.parts.filter((p) => p.range).map((p) => [p.role, p.range]),
      );
      expect(ranges, 'ranges').toEqual(expected.ranges ?? {});
      const classes = Object.fromEntries(
        t.parts.filter((p) => p.ingredientClass).map((p) => [p.role, p.ingredientClass]),
      );
      expect(classes, 'ingredient_classes').toEqual(expected.ingredient_classes ?? {});
      return;
    }
    case 'template_family': {
      const templates = i.templates as RatioTemplate[];
      const id = i.id as string;
      if (i.query === 'children')
        return expect(templateChildren(templates, id)).toEqual(expected.ids);
      if (i.query === 'siblings')
        return expect(templateSiblings(templates, id)).toEqual(expected.ids);
      if (i.query !== 'ancestors')
        throw new Error(`${vector.id}: unknown query ${String(i.query)}`);
      const result = templateAncestors(templates, id);
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      expect(result.ids).toEqual(expected.ids);
      return;
    }
    case 'ratio_check': {
      const amounts = Object.fromEntries(
        (i.lines as { name: string; g: number }[]).map((l) => [l.name, l.g]),
      );
      const anchor = i.anchor as string | undefined;
      const result = checkRatio(
        effective(i.template as InlineTemplate),
        amounts,
        anchor ? { anchor } : {},
      );
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      const by = <K extends 'parts' | 'sharePct' | 'templateSharePct' | 'deltaParts'>(key: K) =>
        Object.fromEntries(result.roles.map((r) => [r.role, r[key]]));
      nearRecord(by('parts'), record('parts'), tol, 'parts');
      nearRecord(by('sharePct'), record('share_pct'), tol, 'share_pct');
      nearRecord(by('templateSharePct'), record('template_share_pct'), tol, 'template_share_pct');
      nearRecord(by('deltaParts'), record('delta_parts'), tol, 'delta_parts');
      if (expected.position !== undefined) {
        const withRange = result.roles.filter((r) => r.position !== undefined);
        expect(Object.fromEntries(withRange.map((r) => [r.role, r.position]))).toEqual(
          expected.position,
        );
        const distance = Object.fromEntries(withRange.map((r) => [r.role, r.distance as number]));
        nearRecord(distance, record('distance'), tol, 'distance');
      }
      if (expected.not_used !== undefined) expect(result.notUsed).toEqual(expected.not_used);
      if (expected.extra !== undefined) expect(result.extra).toEqual(expected.extra);
      return;
    }
    case 'scale_anchor': {
      const anchor = i.anchor as { name: string; g: number };
      const result = scaleFromAnchor(
        effective(i.template as InlineTemplate),
        anchor.name,
        anchor.g,
      );
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      nearRecord(result.g, record('g'), tol, 'g');
      return;
    }
    case 'template_percent': {
      const result = templatePercent(effective(i.template as InlineTemplate));
      if (failing) return expectError(result, vector);
      if (!result.ok) throw new Error(`${vector.id}: ${JSON.stringify(result.error)}`);
      nearRecord(result.pct, record('pct'), tol, 'pct');
      return;
    }
    default:
      throw new Error(`${vector.id}: unknown vector kind ${String(i.kind)}`);
  }
}

describe('templates vectors', () => {
  test.each(vectors.map((v) => [v.id, v] as const))('%s', (_id, vector) => run(vector));
  test('unknown kinds are rejected', () => {
    const bogus: Vector = {
      id: 'x',
      description: '',
      inputs: { kind: 'nope' },
      tolerance: 0,
      source: 's',
    };
    expect(() => run(bogus)).toThrow(/unknown vector kind/);
  });
});
