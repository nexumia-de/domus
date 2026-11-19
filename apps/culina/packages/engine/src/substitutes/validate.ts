// Substitute rules the schema cannot state: the text complete, a source with a short sentence, two
// different ingredients, a usable factor, ids unique and, given a catalogue, known ingredients.
import { contentResult, found } from '../content/types';
import type { ContentFinding, ContentResult } from '../content/types';
import { isI18nText } from '../text/i18n';
import { MAX_SENTENCE_WORDS } from '../techniques/validate';
import type { Substitute } from './types';

/** What a check may know besides the substitute itself. */
export interface SubstituteChecks {
  /** The ingredient ids of the catalogue; `from` and `to` must be among them. */
  ingredientIds?: ReadonlySet<string>;
}

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

function findings(s: Substitute, checks: SubstituteChecks): ContentFinding[] {
  const out: ContentFinding[] = [];
  if (!isI18nText(s.changes)) out.push(found('text-incomplete', 'changes'));
  if (s.from === s.to) out.push(found('same-ingredient', 'to', s.to));
  if (s.factor !== undefined && !(Number.isFinite(s.factor) && s.factor > 0)) {
    out.push(found('bad-range', 'factor'));
  }
  for (const field of ['from', 'to'] as const) {
    if (checks.ingredientIds !== undefined && !checks.ingredientIds.has(s[field])) {
      out.push(found('unknown-ingredient', field, s[field]));
    }
  }
  if (s.sources.length === 0) out.push(found('no-source', 'sources'));
  s.sources.forEach((source, i) => {
    const n = words(source.sentence);
    if (n === 0) out.push(found('text-incomplete', `sources[${i}].sentence`));
    if (n > MAX_SENTENCE_WORDS) out.push(found('sentence-too-long', `sources[${i}].sentence`));
  });
  return out;
}

/**
 * Checks one substitute: `changes` complete in both languages, `from` and `to` different, a positive
 * `factor` if there is one, at least one source with a sentence of at most 25 words, and, when the
 * catalogue ids are given, both ingredients known. The shape is checked by `substitute.schema.json`.
 *
 * @param substitute - A substitute, as in its JSON file.
 * @param checks - Optional: the catalogue ids.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateSubstitute(
  substitute: Substitute,
  checks: SubstituteChecks = {},
): ContentResult {
  return contentResult(findings(substitute, checks));
}

/**
 * Checks a list: each substitute as `validateSubstitute` and no id twice (`duplicate-id`, path
 * `[index].id`). The findings carry the path prefixed by `[index].`.
 *
 * @param list - All substitutes, for example the shipped ones.
 * @param checks - Optional: the catalogue ids.
 */
export function validateSubstitutes(
  list: readonly Substitute[],
  checks: SubstituteChecks = {},
): ContentResult {
  const seen = new Set<string>();
  const out: ContentFinding[] = [];
  list.forEach((substitute, i) => {
    if (seen.has(substitute.id)) out.push(found('duplicate-id', `[${i}].id`, substitute.id));
    seen.add(substitute.id);
    for (const f of findings(substitute, checks)) out.push({ ...f, path: `[${i}].${f.path}` });
  });
  return contentResult(out);
}
