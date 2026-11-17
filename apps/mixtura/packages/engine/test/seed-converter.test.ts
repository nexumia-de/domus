// The converter run on a small committed fixture in the source format must
// give exactly the committed expected files; bad input fails the run.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { convert } from '../../../scripts/seed/convert';
import { engineRoot } from './seed-data';

const repo = join(engineRoot, '../..');
const fixture = join(repo, 'scripts/seed/fixture');
const tmp = mkdtempSync(join(tmpdir(), 'mixtura-seed-test-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const options = (checkout: string, out: string) => ({
  checkout,
  out,
  report: join(out, '..', 'report.json'),
  pin: join(fixture, 'pinned.json'),
  curated: join(engineRoot, 'data/ingredient-properties.json'),
  schemas: join(engineRoot, 'schemas'),
});

describe('fixture', () => {
  const out = join(tmp, 'out');
  const result = convert(options(join(fixture, 'source'), out));

  test.each(['ingredients.json', 'specs.json', 'vocabulary.json'])(
    '%s equals the committed expected file; regenerate with the command in docs/seed-data.md',
    (name) => {
      expect(readFileSync(join(out, name), 'utf8')).toBe(
        readFileSync(join(fixture, 'expected', name), 'utf8'),
      );
    },
  );

  test('a second run gives the same files', () => {
    const again = convert(options(join(fixture, 'source'), join(tmp, 'again')));
    expect(again.files).toEqual(result.files);
  });

  test('skipped recipes, reparented nodes and omitted zeros are reported', () => {
    expect(result.report.skipped).toEqual([
      { id: 'fixture-cup', reasons: ['unit "cup"', 'amount of 0'] },
      { id: 'fixture-parts', reasons: ['unit "parts"'] },
    ]);
  });

  test('counted units are kept, and the figures say which lines they do not count', () => {
    const flip = result.specs.find((s) => s.id === 'fixture-flip');
    expect(flip?.lines.map((l) => l.unit)).toEqual(['ml', 'whole', 'leaf', 'pinch']);
    expect(result.report.balance['lines not counted: counted-without-volume']).toBe(3);
    expect(result.report.balance['specs with a line not counted in the figures']).toBe(1);
    expect(result.report.reparented).toEqual([{ id: 'bourbon', was: 'whiskey', now: 'spirits' }]);
    expect(result.report.abvOmitted).toContain('unfilled-spirit');
    expect(result.report.unclassified).toEqual({ tea: 'tea is marked unclassified' });
  });

  test('no recipe text reaches the output', () => {
    const text = Object.values(result.files).join('');
    expect(text).not.toContain('garnish text');
    expect(text).not.toContain('Invented');
  });
});

describe('bad input fails', () => {
  const copy = (name: string) => {
    const dir = join(tmp, name);
    cpSync(join(fixture, 'source'), dir, { recursive: true });
    return dir;
  };

  test('a field the converter does not know', () => {
    const dir = copy('unknown-field');
    const file = join(dir, 'data/ingredients/gin/data.json');
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    writeFileSync(file, JSON.stringify({ ...rec, surprise: 1 }));
    expect(() => convert(options(dir, join(tmp, 'o1')))).toThrow(/unknown field "surprise"/);
  });

  test('a line naming an ingredient that does not exist', () => {
    const dir = copy('dangling');
    const file = join(dir, 'data/cocktails/fixture-sour/data.json');
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.ingredients[0]._id = 'nothing';
    writeFileSync(file, JSON.stringify(rec));
    expect(() => convert(options(dir, join(tmp, 'o2')))).toThrow(/does not exist/);
  });

  test('output that does not validate against the schemas', () => {
    const dir = copy('bad-ingredient');
    const file = join(dir, 'data/ingredients/gin/data.json');
    const rec = JSON.parse(readFileSync(file, 'utf8'));
    rec.strength = 140;
    writeFileSync(file, JSON.stringify(rec));
    expect(() => convert(options(dir, join(tmp, 'o3')))).toThrow(/seed output is invalid/);
  });

  test('a checkout at another commit than the pin', () => {
    const dir = copy('other-commit');
    mkdirSync(join(dir, '.git'));
    writeFileSync(join(dir, '.git/HEAD'), `${'a'.repeat(40)}\n`);
    expect(() => convert(options(dir, join(tmp, 'o4')))).toThrow(/pinned commit/);
  });
});
