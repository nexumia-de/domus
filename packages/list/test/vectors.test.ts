// Runs every vector file through the package's public entry and compares with what was computed
// by hand (docs/vectors.md). Moved from Emptio's engine on 2026-11-24 with the two kinds.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  addEntry,
  newEntryCategory,
  type CatalogueMatch,
  type EarlierEntry,
  type Entry,
} from '../src/index';

const root = fileURLToPath(new URL('../vectors', import.meta.url));

/** What each kind computes from its `input`; the result is compared with `expected`. */
const kinds: Record<string, (input: never) => unknown> = {
  'new-entry-category': (input: {
    name: string;
    catalogue?: CatalogueMatch;
    earlier: EarlierEntry[];
  }) => ({ categoryId: newEntryCategory(input) }),
  'add-entry': (input: { entries: Entry[]; add: Entry }) => addEntry(input.entries, input.add),
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
