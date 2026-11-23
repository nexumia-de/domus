// The AI prompt and the schema agree (decision ai-prompt-import): every field of the schema is
// named in the prompt of each language with its required flag, every role of the closed lists and
// every unit word the reader knows is listed, the rules are there, and the prompt's example
// passes the same schema the import checks against. What a real model writes for this prompt is
// not proved here: no model is run.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test } from 'vitest';
import { NO_FIXED_SIZE_WORDS, UNIT_WORDS, checkRecipes, recipeImportSchema } from '@culina/engine';
import type { RecipeAnswer } from '@culina/engine';
import {
  PROMPT_EXAMPLE,
  PROMPT_WORDS,
  promptFor,
  schemaFields,
  type PromptLang,
} from '../src/screens/import/ai-prompt';
import { readAnswer } from '../src/exchange/ai-answer';
import { ROLE_IDS } from '../src/editor/units';

const schemaDir = fileURLToPath(new URL('../../engine/schemas/', import.meta.url));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
for (const file of readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(schemaDir + file, 'utf8')) as object);
}
const validate = ajv.getSchema((recipeImportSchema as { $id: string }).$id);
const defs = (recipeImportSchema as { $defs: Record<string, { enum?: string[] }> }).$defs;
const langs: PromptLang[] = ['en', 'de'];

describe.each(langs)('the %s prompt', (lang) => {
  const prompt = promptFor(lang);
  const w = PROMPT_WORDS[lang];

  test('names every field of the schema with its required flag, and no field the schema lacks', () => {
    const fields = schemaFields();
    expect(fields.length).toBeGreaterThan(25);
    for (const path of fields) {
      const field = path.split('.').pop() as string;
      expect(prompt, path).toMatch(
        new RegExp(`- "${field}" \\((${w.required}|${w.optional}), [^)]*\\): `),
      );
    }
    expect(Object.keys(w.fields).sort()).toEqual([...fields].sort());
    const named = [...prompt.matchAll(/^- "([A-Za-z]+)" \(/gm)].map((m) => m[1]);
    expect(named.length).toBe(fields.length);
  });

  test('lists the roles of both closed lists and the units the reader knows', () => {
    for (const role of [...(defs.slotRole?.enum ?? []), ...(defs.lineRole?.enum ?? [])]) {
      expect(prompt, role).toContain(role);
    }
    for (const unit of [...UNIT_WORDS, ...NO_FIXED_SIZE_WORDS])
      expect(prompt, unit).toContain(unit);
    expect(UNIT_WORDS).toEqual(expect.arrayContaining(['g', 'tbsp']));
    expect(NO_FIXED_SIZE_WORDS).toEqual(expect.arrayContaining(['EL', 'TL', 'Prise', 'Msp.']));
  });

  test('says to mark every guessed amount and to copy no text beyond the recipe', () => {
    expect(prompt).toContain('"guessed": true');
    expect(prompt).toContain(w.rules[0] as string);
    expect(prompt).toContain(lang === 'de' ? 'Übernimm keinen Text' : 'Copy no text beyond');
  });

  test('its example passes the schema and the name checks, and is in the prompt', () => {
    expect(validate?.(PROMPT_EXAMPLE[lang]), JSON.stringify(validate?.errors)).toBe(true);
    expect(checkRecipes(PROMPT_EXAMPLE[lang] as RecipeAnswer)).toEqual([]);
    expect(prompt).toContain(JSON.stringify(PROMPT_EXAMPLE[lang], null, 2));
    // The app's own reader takes it too (the compiled validator, as in the browser).
    expect(readAnswer(JSON.stringify(PROMPT_EXAMPLE[lang])).ok).toBe(true);
  });
});

test('the slot roles of the format are the roles the dish editor offers', () => {
  expect([...(defs.slotRole?.enum ?? [])].sort()).toEqual([...ROLE_IDS].sort());
});

test('the prompt is generated: a field without an explanation stops it', () => {
  const words = PROMPT_WORDS.en.fields;
  const kept = words['line.note'];
  delete words['line.note'];
  try {
    expect(() => promptFor('en')).toThrow(/line\.note/);
  } finally {
    words['line.note'] = kept as string;
  }
});
