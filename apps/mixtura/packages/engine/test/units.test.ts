import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { validate } from './helpers/json-schema';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const table = JSON.parse(read('../data/units.json'));
const schema = JSON.parse(read('../data/units.schema.json'));
const doc = read('../../../docs/units.md');

type Row = {
  id: string;
  kind: string;
  value: number | null;
  status: string;
  evidence: string;
  overridable: boolean;
};

function documentRows(): Row[] {
  const block =
    doc.split('<!-- units-table:start -->')[1]?.split('<!-- units-table:end -->')[0] ?? '';
  return block
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => {
      const [id, kind, value, status, evidence, overridable] = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', ''));
      return {
        id: id ?? '',
        kind: kind ?? '',
        value: value === 'none' ? null : Number(value),
        status: status ?? '',
        evidence: evidence ?? '',
        overridable: overridable === 'yes',
      };
    });
}

test('units.json validates against its schema', () => {
  expect(validate(schema, table)).toEqual([]);
});

test('the document table equals units.json', () => {
  const fromJson: Row[] = table.units.map((u: Row) => ({
    id: u.id,
    kind: u.kind,
    value: u.value,
    status: u.status,
    evidence: u.evidence,
    overridable: u.overridable,
  }));
  expect(documentRows()).toEqual(fromJson);
});

test('unit ids and symbols are unique', () => {
  const ids = table.units.map((u: Row) => u.id);
  expect(new Set(ids).size).toBe(ids.length);
  const symbols = table.units.flatMap((u: { symbols: string[] }) =>
    u.symbols.map((s) => s.toLowerCase()),
  );
  expect(new Set(symbols).size).toBe(symbols.length);
});
