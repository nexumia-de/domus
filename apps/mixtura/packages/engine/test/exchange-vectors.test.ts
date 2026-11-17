// Runs every vector in vectors/exchange/: the plan of a merge or replace and
// the refusals of an export file (docs/export-format.md). The schema check is
// the host's, so these vectors stub it; test/exchange.test.ts runs the real one.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  isNoOp,
  KINDS,
  parseExportFile,
  planImport,
  type ImportMode,
  type Kind,
  type Snapshot,
} from '../src/index';

const dir = fileURLToPath(new URL('../vectors/exchange/', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(`${dir}${name}`, 'utf8'));
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

type Partial5<T> = Partial<Record<Kind, T>>;

interface PlanVector {
  id: string;
  kind: 'plan';
  title: string;
  mode: ImportMode;
  current: Partial5<object[]>;
  incoming: Partial5<object[]>;
  expected: {
    added?: Partial5<number>;
    replaced?: Partial5<number>;
    skipped?: Partial5<number>;
    removed?: Partial5<number>;
    writes?: Partial5<string[]>;
    deletes?: Partial5<string[]>;
  };
}

interface ParseVector {
  id: string;
  kind: 'parse';
  title: string;
  document: unknown;
  bytes: number;
  options?: { limit?: number; schemaProblems?: string[] };
  expected: {
    ok: boolean;
    migratedFrom?: number | null;
    failure?: string;
    found?: number;
    supported?: number;
    problem?: string;
  };
}

type Vector = PlanVector | ParseVector;

const snapshot = (part: Partial5<object[]>): Snapshot =>
  Object.fromEntries(KINDS.map((k) => [k, part[k] ?? []])) as unknown as Snapshot;
const counts = (part: Partial5<number> = {}) =>
  Object.fromEntries(KINDS.map((k) => [k, part[k] ?? 0]));
const keys = (records: object[]): string[] =>
  records.map(
    (r) =>
      (r as { id?: string; ingredientId?: string }).id ??
      (r as { ingredientId: string }).ingredientId,
  );

test('both kinds have vectors and every file has its id as name', () => {
  const vectors = files.map((f) => read(f) as Vector);
  expect(new Set(vectors.map((v) => v.kind))).toEqual(new Set(['plan', 'parse']));
  for (const [i, f] of files.entries()) expect((vectors[i] as Vector).id + '.json').toBe(f);
});

describe.each(files)('%s', (file) => {
  const v = read(file) as Vector;
  test(v.title, () => {
    if (v.kind === 'plan') {
      const plan = planImport(snapshot(v.current), snapshot(v.incoming), v.mode);
      expect(plan.mode).toBe(v.mode);
      expect(plan.added).toEqual(counts(v.expected.added));
      expect(plan.replaced).toEqual(counts(v.expected.replaced));
      expect(plan.skipped).toEqual(counts(v.expected.skipped));
      expect(plan.removed).toEqual(counts(v.expected.removed));
      for (const k of KINDS) {
        expect(keys(plan.writes[k]), `writes ${k}`).toEqual(v.expected.writes?.[k] ?? []);
        expect(keys(plan.deletes[k]), `deletes ${k}`).toEqual(v.expected.deletes?.[k] ?? []);
      }
      const changes = [v.expected.added, v.expected.replaced, v.expected.removed].some((c) =>
        Object.values(c ?? {}).some((n) => n > 0),
      );
      expect(isNoOp(plan)).toBe(!changes);
      return;
    }
    const text = typeof v.document === 'string' ? v.document : JSON.stringify(v.document);
    const problems = v.options?.schemaProblems ?? [];
    const result = parseExportFile(text, v.bytes, () => problems, {
      ...(v.options?.limit !== undefined && { limit: v.options.limit }),
    });
    expect(result.ok).toBe(v.expected.ok);
    if (result.ok) {
      expect(result.migratedFrom).toBe(v.expected.migratedFrom);
      return;
    }
    expect(result.failure.kind).toBe(v.expected.failure);
    if (result.failure.kind === 'newer') {
      expect(result.failure.found).toBe(v.expected.found);
      expect(result.failure.supported).toBe(v.expected.supported);
    }
    if (result.failure.kind === 'invalid' && v.expected.problem)
      expect(result.failure.problems).toContain(v.expected.problem);
  });
});
