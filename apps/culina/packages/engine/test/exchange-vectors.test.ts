// Runs the vectors in vectors/export, vectors/match and vectors/merge against the engine's
// public entry (docs/vectors.md): the export file, matching names, merging and id remapping.
import { describe, expect, test } from 'vitest';
import {
  EXPORT_KINDS,
  buildExport,
  conflictKey,
  exportFileName,
  matchIngredients,
  mergeWrites,
  parseExport,
  planMerge,
  remapIngredients,
  serializeExport,
} from '../src/index';
import type {
  Candidate,
  Choice,
  ExportKind,
  ExportMigration,
  ExportRecord,
  FullRecordSets,
  RecordSets,
} from '../src/index';
import { envelopeValidator, validators } from './validators';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

const full = (sets: RecordSets): FullRecordSets =>
  Object.fromEntries(EXPORT_KINDS.map((k) => [k, [...(sets[k] ?? [])]])) as FullRecordSets;

const byId = (list: readonly ExportRecord[]): ExportRecord[] =>
  [...list].sort((a, b) => (a.id < b.id ? -1 : 1));

const mark =
  (to: number): ExportMigration['migrate'] =>
  (file) => ({ ...file, 'x-step': `${String(file['x-step'] ?? '')}>${to}` });

const MIGRATIONS: Record<string, ExportMigration[]> = {
  'test:rename-then-mark': [
    { from: 1, to: 2, migrate: mark(2) },
    { from: 2, to: 3, migrate: mark(3) },
  ],
  'test:rename-only': [{ from: 1, to: 2, migrate: mark(2) }],
};

const counts = (records: FullRecordSets): Record<string, number> =>
  Object.fromEntries(
    EXPORT_KINDS.flatMap((k) => (records[k].length > 0 ? [[k, records[k].length]] : [])),
  );

function roundTrip(vector: Vector): void {
  const i = vector.inputs as unknown as { records: RecordSets; exportedAt: string };
  const envelope = buildExport(i.records, i.exportedAt);
  expect(envelopeValidator(envelope), JSON.stringify(envelopeValidator.errors)).toBe(true);
  const text = serializeExport(envelope);
  const read = parseExport(text, validators);
  if (!read.ok) throw new Error(`${vector.id}: ${read.error.code}`);
  const e = vector.expected as {
    kinds: string[];
    counts: Record<string, number>;
    fileName: string;
  };
  for (const kind of EXPORT_KINDS) {
    expect(read.content.records[kind], kind).toEqual(byId(i.records[kind] ?? []));
  }
  expect(EXPORT_KINDS.filter((k) => envelope[k] !== undefined)).toEqual(e.kinds);
  expect(counts(read.content.records)).toEqual(e.counts);
  expect(exportFileName(i.exportedAt)).toBe(e.fileName);
  // Exporting what was read gives the same text.
  expect(serializeExport(buildExport(read.content.records, i.exportedAt))).toBe(text);
}

function parse(vector: Vector): void {
  const i = vector.inputs as unknown as {
    text?: string;
    file?: unknown;
    current?: number;
    migrations?: string;
  };
  const text = i.text ?? JSON.stringify(i.file);
  const options = {
    ...(i.current === undefined ? {} : { current: i.current }),
    ...(i.migrations === undefined ? {} : { migrations: MIGRATIONS[i.migrations] ?? [] }),
  };
  const result = parseExport(text, validators, options);
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { counts: Record<string, number>; formatVersion?: number };
  expect(counts(result.content.records)).toEqual(e.counts);
  if (e.formatVersion !== undefined) expect(result.content.formatVersion).toBe(e.formatVersion);
}

function match(vector: Vector): void {
  const i = vector.inputs as unknown as { names: string[]; candidates: Candidate[] };
  const got = matchIngredients(i.names, i.candidates).map((m) => ({
    name: m.name,
    exact: m.exact?.id ?? null,
    close: m.close.map((c) => c.id),
    classes: m.classes.map((c) => c.id),
  }));
  const expected = (
    vector.expected as { matches: { name: string; exact: string | null; close: string[] }[] }
  ).matches;
  expect(got).toEqual(expected);
}

const idsByKind = (sets: FullRecordSets): Record<string, string[]> =>
  Object.fromEntries(
    EXPORT_KINDS.flatMap((k) => (sets[k].length > 0 ? [[k, sets[k].map((r) => r.id)]] : [])),
  );

function merge(vector: Vector): void {
  const i = vector.inputs as unknown as {
    mine: RecordSets;
    file: RecordSets;
    choices: Record<string, Choice>;
  };
  const plan = planMerge(full(i.mine), full(i.file));
  const writes = mergeWrites(plan, new Map(Object.entries(i.choices)));
  const e = vector.expected as {
    add: Record<string, string[]>;
    same: Record<string, number>;
    conflicts: string[];
    immutable?: string[];
    skippedNotes: string[];
    writes: string[];
  };
  expect(idsByKind(plan.add), 'add').toEqual(e.add);
  expect(Object.fromEntries(Object.entries(plan.same).filter(([, n]) => n > 0)), 'same').toEqual(
    e.same,
  );
  expect(plan.conflicts.map(conflictKey), 'conflicts').toEqual(e.conflicts);
  expect(plan.conflicts.filter((c) => c.immutable).map(conflictKey), 'immutable').toEqual(
    e.immutable ?? [],
  );
  expect(plan.skippedNotes, 'skippedNotes').toEqual(e.skippedNotes);
  expect(
    writes.map((w) => `${w.kind}/${w.record.id}`),
    'writes',
  ).toEqual(e.writes);
}

type Ref = { kind: string; id: string };
function remap(vector: Vector): void {
  const i = vector.inputs as unknown as { records: RecordSets; map: Record<string, string> };
  const out = remapIngredients(full(i.records), new Map(Object.entries(i.map)));
  const refs = (list: unknown[], field: string): [string, string][] =>
    list.flatMap((r) =>
      ((r as Record<string, unknown>)[field] as { ref: Ref }[]).map((x): [string, string] => [
        x.ref.kind,
        x.ref.id,
      ]),
    );
  const got = {
    ingredients: out.ingredients.map((r) => r.id),
    parents: Object.fromEntries(
      out.ingredients.flatMap((r) => (r.parentId === undefined ? [] : [[r.id, r.parentId]])),
    ),
    lineRefs: refs(out.components, 'lines'),
    slotRefs: refs(out.dishes, 'slots'),
    stockRefs: out.stock.map((s) => [(s.ref as Ref).kind, (s.ref as Ref).id]),
    affinities: out.affinities.map((a) => [a.a, a.b]),
  };
  expect(got).toEqual(vector.expected);
}

const RUNNERS: Record<string, (v: Vector) => void> = {
  export_round_trip: roundTrip,
  export_parse: parse,
  match_names: match,
  merge_plan: merge,
  remap_ingredients: remap,
};

describe.each(['export', 'match', 'merge'])('vectors/%s', (folder) => {
  for (const vector of loadVectors(folder)) {
    test(vector.id, () => {
      const run = RUNNERS[vector.inputs.kind];
      if (!run) throw new Error(`${vector.id}: unknown kind ${vector.inputs.kind}`);
      run(vector);
    });
  }
});

test('the kinds of the engine are the collections of the export schema', () => {
  const properties = Object.keys(
    (envelopeValidator.schema as { properties: Record<string, unknown> }).properties,
  );
  for (const kind of EXPORT_KINDS as readonly ExportKind[]) expect(properties).toContain(kind);
});
