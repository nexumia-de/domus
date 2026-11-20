// The five evidence levels of a statement (docs/data-model.md): the one list, the schemas that carry
// it, the validators, and the shipped notes, which keep the level they had.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  TECHNIQUE_LEVELS,
  validateHandlingRule,
  validateSubstitute,
  validateTechnique,
} from '../src/index';
import type { HandlingRule, Substitute, Technique } from '../src/index';
import { contentValidators as schema } from './validators';

const dir = (kind: string): string => fileURLToPath(new URL(`../data/${kind}/`, import.meta.url));
const shipped = (kind: string): { id: string; level: string }[] =>
  readdirSync(dir(kind))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(dir(kind) + f, 'utf8')) as { id: string; level: string });
const shippedWithSources = (
  kind: string,
): { id: string; level: string; sources: { level?: string }[] }[] =>
  readdirSync(dir(kind))
    .filter((f) => f.endsWith('.json'))
    .map(
      (f) =>
        JSON.parse(readFileSync(dir(kind) + f, 'utf8')) as {
          id: string;
          level: string;
          sources: { level?: string }[];
        },
    );
const readSchema = (name: string): { properties: { level: { enum: string[] } } } =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../schemas/${name}.schema.json`, import.meta.url)), 'utf8'),
  ) as { properties: { level: { enum: string[] } } };
const example = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../schemas/examples/${name}.valid.json`, import.meta.url)),
      'utf8',
    ),
  ) as T;

describe('the levels', () => {
  test('there are five, tested and authority beside the three that were', () => {
    expect([...TECHNIQUE_LEVELS]).toEqual([
      'studied',
      'textbook',
      'tested',
      'authority',
      'tradition',
    ]);
  });
  test('the schemas of notes, handling rules and substitutes carry the same words', () => {
    for (const name of ['technique', 'handling', 'substitute']) {
      expect(readSchema(name).properties.level.enum, name).toEqual([...TECHNIQUE_LEVELS]);
    }
  });
  test('the schemas accept every level and refuse another word', () => {
    const t = example<Technique>('technique');
    const h = example<HandlingRule>('handling');
    const s = example<Substitute>('substitute');
    for (const level of TECHNIQUE_LEVELS) {
      expect(schema.technique({ ...t, level }), level).toBe(true);
      expect(schema.handling({ ...h, level }), level).toBe(true);
      expect(schema.substitute({ ...s, level }), level).toBe(true);
    }
    for (const bad of ['folklore', 'Tested', 'authorities', '']) {
      expect(schema.technique({ ...t, level: bad }), bad).toBe(false);
      expect(schema.handling({ ...h, level: bad }), bad).toBe(false);
      expect(schema.substitute({ ...s, level: bad }), bad).toBe(false);
    }
  });
  test('the validators accept every level and name an unknown one', () => {
    const t = example<Technique>('technique');
    const h = example<HandlingRule>('handling');
    const s = example<Substitute>('substitute');
    for (const level of TECHNIQUE_LEVELS) {
      expect(validateTechnique({ ...t, level })).toEqual({ ok: true });
      expect(validateHandlingRule({ ...h, level })).toEqual({ ok: true });
      expect(validateSubstitute({ ...s, level })).toEqual({ ok: true });
    }
    const bad = { level: 'folklore' as never };
    for (const result of [
      validateTechnique({ ...t, ...bad }),
      validateHandlingRule({ ...h, ...bad }),
      validateSubstitute({ ...s, ...bad }),
    ]) {
      expect(result).toMatchObject({
        ok: false,
        error: { findings: [{ code: 'unknown-level', path: 'level', value: 'folklore' }] },
      });
    }
  });
});

describe('the shipped notes', () => {
  test('every note, handling rule and substitute has one of the levels', () => {
    for (const kind of ['techniques', 'handling', 'substitutes']) {
      for (const item of shipped(kind)) {
        expect(TECHNIQUE_LEVELS as readonly string[], `${kind}/${item.id}`).toContain(item.level);
      }
    }
  });
  test('none was re-labelled: they are textbook notes, but for the ones named here', () => {
    // A level other than `textbook` needs a source of that kind that was read. The notes of
    // 2026-11-19 all stay `textbook`; a later note that rests on a kitchen test alone is named here
    // with its level (docs/book-findings.md).
    const other: Record<string, string> = { 'handling/mushrooms-wash': 'tested' };
    const seen: string[] = [];
    for (const kind of ['techniques', 'handling', 'substitutes']) {
      for (const item of shipped(kind)) {
        const key = `${kind}/${item.id}`;
        expect(item.level, key).toBe(other[key] ?? 'textbook');
        if (other[key] !== undefined) seen.push(key);
      }
    }
    expect(seen.sort()).toEqual(Object.keys(other).sort());
  });
  test('a note at the level `tested` rests on a source that says so', () => {
    for (const kind of ['techniques', 'handling', 'substitutes']) {
      for (const item of shippedWithSources(kind)) {
        if (item.level !== 'tested') continue;
        expect(
          item.sources.some((s) => s.level === 'tested'),
          `${kind}/${item.id}`,
        ).toBe(true);
      }
    }
  });
});
