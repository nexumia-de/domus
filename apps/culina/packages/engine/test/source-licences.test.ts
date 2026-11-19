// The licence of every source of a shipped note, handling rule and substitute is in the data as an
// SPDX identifier, and the counts per licence are the ones the decision record states. A later build
// without what is non-commercial reads this field (docs/decisions/sources-licence.md).
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { contentValidators as schema } from './validators';

interface Source {
  url: string;
  licence?: string;
}
interface Item {
  id: string;
  sources: Source[];
}
const KINDS = ['techniques', 'handling', 'substitutes'] as const;
const read = (kind: string): { file: string; item: Item }[] => {
  const dir = fileURLToPath(new URL(`../data/${kind}/`, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((file) => ({
      file: `${kind}/${file}`,
      item: JSON.parse(readFileSync(dir + file, 'utf8')) as Item,
    }));
};
const all = KINDS.flatMap(read);
const sources = all.flatMap(({ file, item }) => item.sources.map((source) => ({ file, source })));

/** The SPDX identifiers in use. A new one is added here and to the decision record. */
const KNOWN = ['CC-BY-4.0', 'CC-BY-NC-4.0', 'CC-BY-NC-SA-4.0'];
const isNonCommercial = (id: string): boolean => /(^|-)NC(-|$)/.test(id);

const counted = (): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { source } of sources) {
    const id = source.licence ?? '(none)';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

/** The table of the decision record: `| CC-BY-NC-SA-4.0 | 128 | ... |`. */
const documented = (): Map<string, number> => {
  const text = readFileSync(
    fileURLToPath(new URL('../../../docs/decisions/sources-licence.md', import.meta.url)),
    'utf8',
  );
  const rows = new Map<string, number>();
  for (const m of text.matchAll(/^\|\s*`([A-Za-z0-9.+-]+)`\s*\|\s*(\d+)\s*\|/gm)) {
    rows.set(m[1] as string, Number(m[2]));
  }
  return rows;
};

describe('source licences', () => {
  test('every source of every shipped note has a licence, as an SPDX identifier', () => {
    const without = sources.filter(({ source }) => source.licence === undefined).map((s) => s.file);
    expect(without).toEqual([]);
    for (const { file, source } of sources) {
      expect(KNOWN, file).toContain(source.licence);
      expect(source.licence, file).toMatch(/^[A-Za-z0-9][A-Za-z0-9.+-]*$/);
    }
  });
  test('the schemas refuse a licence written as free text', () => {
    for (const { file, item } of all.slice(0, 3)) {
      const kind = file.startsWith('techniques')
        ? 'technique'
        : file.startsWith('handling')
          ? 'handling'
          : 'substitute';
      const bad = {
        ...item,
        sources: item.sources.map((s) => ({ ...s, licence: 'CC BY-NC-SA 4.0' })),
      };
      expect(schema[kind](bad), file).toBe(false);
    }
  });
  test('the counts per licence are the ones the decision record states', () => {
    const counts = counted();
    const rows = documented();
    expect([...rows.keys()].sort()).toEqual([...counts.keys()].sort());
    for (const [id, n] of counts) expect(rows.get(id), id).toBe(n);
    expect(sources.length).toBe(149);
  });
  test('a build without what is non-commercial would leave out the entries with NC, and keep the others', () => {
    const counts = counted();
    const nc = [...counts].filter(([id]) => isNonCommercial(id)).reduce((n, [, c]) => n + c, 0);
    const free = [...counts].filter(([id]) => !isNonCommercial(id)).reduce((n, [, c]) => n + c, 0);
    expect({ nc, free }).toEqual({ nc: 133, free: 16 });
    expect(isNonCommercial('CC-BY-4.0')).toBe(false);
    expect(isNonCommercial('CC-BY-NC-4.0')).toBe(true);
    expect(isNonCommercial('CC-BY-NC-SA-4.0')).toBe(true);
    expect(isNonCommercial('CC-BY-SA-4.0')).toBe(false);
  });
});
