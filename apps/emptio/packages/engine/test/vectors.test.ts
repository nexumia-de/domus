// Until the functions exist (issue 12) this checks the shape of every
// vector file, so a broken or misplaced file is found (docs/vectors.md).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../vectors', import.meta.url));
const kinds = ['home-order', 'new-entry-category', 'add-entry'];

const files = readdirSync(root).flatMap((kind) =>
  readdirSync(join(root, kind))
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({ kind, name, path: join(root, kind, name) })),
);

describe('vector files', () => {
  it('exist for every kind and only for known kinds', () => {
    expect([...new Set(files.map((file) => file.kind))].sort()).toEqual([...kinds].sort());
  });

  it.each(files)('$kind/$name has kind, title, input and expected', ({ kind, path }) => {
    const vector = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    expect(vector.kind).toBe(kind);
    expect(typeof vector.title).toBe('string');
    expect(vector.title).not.toBe('');
    expect(vector.input).toBeTypeOf('object');
    expect(vector.expected).toBeTypeOf('object');
  });
});
