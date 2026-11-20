// docs/data-model.md and the schemas must list the same fields, with the
// same "required" flag; derived rows must not be in a schema.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { type Schema, schemas } from './schema-helpers';

const doc = readFileSync(
  fileURLToPath(new URL('../../../docs/data-model.md', import.meta.url)),
  'utf8',
);

type Field = { required: boolean };
type Obj = { properties?: Record<string, Obj>; items?: Obj; required?: string[]; $ref?: string };

// Walks inline objects and arrays; stops at refs into common (shared types).
function fieldsOf(node: Obj, prefix = ''): Map<string, Field> {
  const out = new Map<string, Field>();
  for (const [name, child] of Object.entries(node.properties ?? {})) {
    const path = `${prefix}${name}`;
    out.set(path, { required: node.required?.includes(name) ?? false });
    let target: Obj | undefined = child;
    if (child.$ref && !child.$ref.startsWith('urn:mixtura:common')) {
      target = schemas[child.$ref.replace('urn:mixtura:', '')] as Obj;
    }
    if (target?.items) target = target.items;
    const sub = target === child && !child.properties ? undefined : target;
    const suffix = child.items?.properties ? '[].' : '.';
    if (sub?.properties) for (const [k, v] of fieldsOf(sub, `${path}${suffix}`)) out.set(k, v);
  }
  return out;
}

function section(heading: string): string {
  const start = doc.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`no section ${heading}`);
  const rest = doc.slice(start + 1);
  const end = rest.indexOf('\n## ', 3);
  return end < 0 ? rest : rest.slice(0, end);
}

function rows(text: string): { cells: string[] }[] {
  return text
    .split('\n')
    .filter((l) => l.startsWith('| `'))
    .map((l) => ({
      cells: l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/^`|`$/g, '')),
    }));
}

const entities: [string, string][] = [
  ['Ingredient', 'ingredient'],
  ['Template', 'template'],
  ['Spec', 'spec'],
  ['Stock', 'stock'],
  ['Affinity', 'affinity'],
  ['Export file', 'export'],
];

describe.each(entities)('%s', (heading, schema) => {
  const documented = rows(section(heading)).map((r) => r.cells);
  const stored = new Map(
    documented.filter((c) => c[1] === 'stored').map((c) => [c[0] as string, c[2]]),
  );
  const actual = fieldsOf(schemas[schema] as Obj);

  test('every documented field is in the schema and the other way round', () => {
    expect([...stored.keys()].sort()).toEqual([...actual.keys()].sort());
  });
  test('required flags agree', () => {
    for (const [path, required] of stored) {
      expect(`${path}: ${required}`).toBe(`${path}: ${actual.get(path)?.required ? 'yes' : 'no'}`);
    }
  });
  test('derived fields are not in the schema', () => {
    for (const c of documented.filter((c) => c[1] === 'derived'))
      expect(actual.has(c[0] as string)).toBe(false);
  });
});

describe('shared types', () => {
  const defs = (schemas.common as { $defs: Record<string, Obj> }).$defs;
  const table = rows(section('Shared types')).map((r) => r.cells);
  test.each(['source', 'quantity', 'range'])('%s', (type) => {
    const documented = table.filter((c) => c[0] === type);
    const actual = fieldsOf(defs[type] as Obj);
    expect(documented.map((c) => c[1]).sort()).toEqual([...actual.keys()].sort());
    for (const c of documented) {
      expect(`${c[1]}: ${c[3]}`).toBe(
        `${c[1]}: ${actual.get(c[1] as string)?.required ? 'yes' : 'no'}`,
      );
    }
  });
});

test('the schemas are all covered', () => {
  const covered = new Set([...entities.map((e) => e[1]), 'common', 'prepared-ingredient']);
  expect(Object.keys(schemas).filter((n) => !covered.has(n))).toEqual([]);
});

// The stock value is shared with other apps, whose fields are kept.
const OPEN = new Set(['common', 'stock']);

test('every schema is draft 2020-12 with additionalProperties false on entities', () => {
  for (const [name, s] of Object.entries(schemas as Record<string, Schema>)) {
    expect(s.$schema, name).toBe('https://json-schema.org/draft/2020-12/schema');
    if (!OPEN.has(name)) expect(s.additionalProperties, name).toBe(false);
  }
});
