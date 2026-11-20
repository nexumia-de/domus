// Shipped handling rules: every file of data/handling/ meets the schema and the engine rules, rests
// on a known technique and a catalogue ingredient or group, and shows through the catalogue tree.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  TECHNIQUES,
  handlingRules,
  validateHandlingRule,
  validateHandlingRules,
} from '../src/index';
import type { HandlingRule, TreeNode } from '../src/index';
import { contentValidators as schema } from './validators';

const dir = fileURLToPath(new URL('../data/handling/', import.meta.url));
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();
const rules = files.map((f) => JSON.parse(readFileSync(dir + f, 'utf8')) as HandlingRule);
const catalogue = (
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../app/data/ingredient-catalogue.json', import.meta.url)),
      'utf8',
    ),
  ) as { ingredients: (TreeNode & { name: string })[] }
).ingredients;
const context = {
  techniqueIds: new Set(TECHNIQUES.map((t) => t.id)),
  ingredientIds: new Set(catalogue.map((i) => i.id)),
};

describe('shipped handling rules', () => {
  test('there are rules', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  test('every file meets the schema, its file name is its id and the engine rules hold', () => {
    for (const [i, file] of files.entries()) {
      const rule = rules[i] as HandlingRule;
      expect(schema.handling(rule), `${file}: ${JSON.stringify(schema.handling.errors)}`).toBe(
        true,
      );
      expect(`${rule.id}.json`).toBe(file);
      expect(validateHandlingRule(rule, context), file).toEqual({ ok: true });
    }
  });
  test('no id twice', () => {
    expect(validateHandlingRules(rules, context)).toEqual({ ok: true });
  });
  test('every source is read: a page with an https URL and a licence, or a book with its ISBN', () => {
    for (const rule of rules) {
      for (const source of rule.sources) {
        if (source.url === undefined) {
          expect(source.isbn, rule.id).toMatch(/^97[89][0-9]{10}$/);
        } else {
          expect(source.url, rule.id).toMatch(/^https:\/\//);
          expect(source.licence, rule.id).toBeTruthy();
        }
      }
    }
  });
  test('a rule on a group shows for the ingredients under it and fades when learned', () => {
    const butter =
      catalogue.find((i) => i.parentId === 'fdc-group-butter')?.id ?? 'fdc-group-butter';
    const shown = (learned: string[]) => {
      const got = handlingRules([butter, 'fdc-173468'], rules, catalogue, new Set(learned));
      if (!got.ok) throw new Error(got.error.code);
      return got.rules.map((r) => r.rule.id);
    };
    expect(shown([])).toContain('butter-warm-for-hollandaise');
    expect(shown([])).toContain('salt-pasta-water');
    expect(shown(['warm-emulsion'])).not.toContain('butter-warm-for-hollandaise');
  });
});
