// Runs every vector in vectors/versions against the engine (docs/vectors.md): diffs of
// components and dishes, the chain and head of a family, variations and their parent.
import { describe, expect, test } from 'vitest';
import {
  diffComponentVersions,
  diffDishVersions,
  variationCycles,
  variationParent,
  variationsOf,
  versionFamily,
  versionNumber,
} from '../src/index';
import type { DiffComponent, DiffDish, DiffLine, Versioned, VersionChange } from '../src/index';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

const line = (l: DiffLine | undefined): string | undefined =>
  l === undefined
    ? undefined
    : `${l.ref.kind}:${l.ref.id}${l.amount ? ` ${l.amount.value} ${l.amount.unit}` : ''}`;

const shown = (c: VersionChange): unknown =>
  c.type === 'field'
    ? { type: 'field', field: c.field, before: c.before, after: c.after }
    : {
        type: 'line',
        kind: c.kind,
        fields: c.fields,
        before: line(c.before),
        after: line(c.after),
      };

function diff(vector: Vector): void {
  const i = vector.inputs;
  const result =
    i.kind === 'diff_dish'
      ? diffDishVersions(i.before as DiffDish, i.after as DiffDish)
      : diffComponentVersions(i.before as DiffComponent, i.after as DiffComponent);
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { empty: boolean; changes: unknown[] };
  expect(result.diff.empty, 'empty').toBe(e.empty);
  expect(
    result.diff.changes.map((c) => JSON.parse(JSON.stringify(shown(c)))),
    'changes',
  ).toEqual(e.changes);
}

function family(vector: Vector): void {
  const i = vector.inputs as unknown as { id: string; records: Versioned[] };
  const result = versionFamily(i.records, i.id);
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { versions: string[]; head: string; number: number };
  expect(result.versions.map((r) => r.id)).toEqual(e.versions);
  expect(result.head.id).toBe(e.head);
  expect(versionNumber(i.records, i.id)).toBe(e.number);
}

function variations(vector: Vector): void {
  const i = vector.inputs as unknown as { id: string; records: Versioned[] };
  const e = vector.expected as {
    variations: { family: string; head: string }[];
    parent?: { kind: string; id?: string };
  };
  expect(variationsOf(i.records, i.id).map((v) => ({ family: v.family, head: v.head.id }))).toEqual(
    e.variations,
  );
  if (e.parent !== undefined) {
    const got = variationParent(i.records, i.id);
    expect({ kind: got.kind, ...(got.kind === 'parent' ? { id: got.record.id } : {}) }).toEqual(
      e.parent,
    );
  }
}

function cycles(vector: Vector): void {
  const i = vector.inputs as unknown as { id: string; records: Versioned[] };
  const e = vector.expected as { cycles: string[][]; parent: { kind: string; id: string } };
  expect(variationCycles(i.records)).toEqual(e.cycles);
  const got = variationParent(i.records, i.id);
  expect(
    got.kind === 'parent' ? { kind: got.kind, id: got.record.id } : { kind: got.kind },
  ).toEqual(e.parent);
}

describe('version vectors', () => {
  for (const vector of loadVectors('versions')) {
    test(vector.id, () => {
      switch (vector.inputs.kind) {
        case 'diff_component':
        case 'diff_dish':
          return diff(vector);
        case 'version_family':
          return family(vector);
        case 'variation_cycles':
          return cycles(vector);
        case 'variations':
          return variations(vector);
        default:
          throw new Error(`${vector.id}: unknown kind ${vector.inputs.kind}`);
      }
    });
  }
});
