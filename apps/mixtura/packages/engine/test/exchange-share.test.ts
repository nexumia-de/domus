// The share file (docs/export-format.md#share-file): vectors in
// vectors/exchange/share/, and a check that every file built from the
// example data passes the real schema and the id rules of the parser.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { buildShareFile, KINDS, parseExportFile, type Kind, type Snapshot } from '../src/index';
import { makeAjv, readJson, schemasDir } from './schema-helpers';

const dir = fileURLToPath(new URL('../vectors/exchange/share/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const AT = '2026-11-18T10:00:00Z';

interface ShareVector {
  id: string;
  kind: 'share';
  title: string;
  current: Record<Kind, object[]>;
  specId: string;
  expected: Partial<Record<Kind, string[]>> & { failure?: string };
}

const ids = (records: object[]): string[] => records.map((r) => (r as { id: string }).id).sort();

test('every file has its id as name and the cases of the brief are covered', () => {
  for (const f of files)
    expect((JSON.parse(readFileSync(`${dir}${f}`, 'utf8')) as ShareVector).id + '.json').toBe(f);
  for (const name of [
    'plain-seed-ingredients',
    'custom-ingredient',
    'riff-of-own-spec',
    'riff-of-seed-drink',
    'own-template',
    'nested-prepared',
    'unknown-spec',
  ])
    expect(files).toContain(`share-${name}.json`);
});

describe.each(files)('%s', (file) => {
  const v = JSON.parse(readFileSync(`${dir}${file}`, 'utf8')) as ShareVector;
  test(v.title, () => {
    const result = buildShareFile(v.current as unknown as Snapshot, v.specId, AT);
    if (v.expected.failure) {
      expect(result).toEqual({
        ok: false,
        failure: { kind: v.expected.failure, specId: v.specId },
      });
      return;
    }
    if (!result.ok) throw new Error('expected a file');
    expect(result.file.exportedAt).toBe(AT);
    for (const kind of KINDS) {
      expect(ids(result.file[kind] as object[]), kind).toEqual((v.expected[kind] ?? []).sort());
    }
  });
});

test('a share file made from the example data passes the real schema and the parser', () => {
  const data = readJson(`${schemasDir}examples/valid/export-full.json`) as Snapshot;
  const check = makeAjv().getSchema('urn:mixtura:export');
  if (!check) throw new Error('no export schema');
  const problems = (value: unknown): string[] =>
    check(value) ? [] : (check.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
  expect(data.specs.length).toBeGreaterThan(0);
  for (const spec of data.specs) {
    const result = buildShareFile(data, spec.id, AT);
    if (!result.ok) throw new Error('expected a file');
    const text = JSON.stringify(result.file);
    const parsed = parseExportFile(text, text.length, problems);
    expect(parsed.ok, JSON.stringify(parsed)).toBe(true);
  }
});
