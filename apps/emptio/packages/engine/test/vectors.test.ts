// Runs every vector file through the engine's public entry and compares with
// what was computed by hand (docs/vectors.md). The kinds of rules 4 and 5 moved with the rules to
// the shared list package (packages/list/test/vectors.test.ts).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  categoryOrder,
  homeOrder,
  suggest,
  type CategoryChange,
  type OrderEntry,
  type SuggestEntry,
} from '../src/index';

const root = fileURLToPath(new URL('../vectors', import.meta.url));

/** What each kind computes from its `input`; the result is compared with `expected`. */
const kinds: Record<string, (input: never) => unknown> = {
  'home-order': (input: { entries: OrderEntry[]; categoryOrder: string[] }) => ({
    order: homeOrder(input.entries, input.categoryOrder).map((entry) => entry.id),
  }),
  'category-order': (input: { starting: string[]; changes: CategoryChange[] }) => ({
    order: categoryOrder(input.starting, input.changes),
  }),
  suggest: (input: { query: string; earlier: SuggestEntry[]; limit?: number }) => ({
    suggestions: suggest(input.query, input.earlier, input.limit),
  }),
};

const files = readdirSync(root).flatMap((kind) =>
  readdirSync(join(root, kind))
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({ kind, name, path: join(root, kind, name) })),
);

describe('vector files', () => {
  it('exist for every kind and only for known kinds', () => {
    expect([...new Set(files.map((file) => file.kind))].sort()).toEqual(Object.keys(kinds).sort());
  });

  it.each(files)('$kind/$name', ({ kind, path }) => {
    const vector = JSON.parse(readFileSync(path, 'utf8')) as {
      kind: string;
      title: string;
      input: never;
      expected: unknown;
    };
    expect(vector.kind).toBe(kind);
    expect(typeof vector.title).toBe('string');
    expect(vector.title).not.toBe('');
    expect(kinds[kind]?.(vector.input)).toEqual(vector.expected);
  });

  it('does not change what it is given', () => {
    for (const { kind, path } of files) {
      const text = readFileSync(path, 'utf8');
      const vector = JSON.parse(text) as { input: never };
      kinds[kind]?.(vector.input);
      expect(vector.input).toEqual((JSON.parse(text) as { input: never }).input);
    }
  });
});
