// Technique rules the schema cannot state: texts complete, the sentence short, ids unique.
import { contentResult, found } from '../content/types';
import type { ContentFinding, ContentResult } from '../content/types';
import { isI18nText } from '../text/i18n';
import { TECHNIQUE_LEVELS } from './types';
import type { Technique } from './types';

/** The most words a source sentence may have (helper plan, rules for content). */
export const MAX_SENTENCE_WORDS = 25;

/** A finding when `level` is not one of the five words (`TECHNIQUE_LEVELS`). Shared by the notes, the handling rules and the substitutes. */
export const levelFindings = (level: string): ContentFinding[] =>
  (TECHNIQUE_LEVELS as readonly string[]).includes(level)
    ? []
    : [found('unknown-level', 'level', level)];

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

function findings(technique: Technique): ContentFinding[] {
  const out: ContentFinding[] = [];
  for (const field of ['name', 'watch', 'why'] as const) {
    if (!isI18nText(technique[field])) out.push(found('text-incomplete', field));
  }
  out.push(...levelFindings(technique.level));
  if (technique.sources.length === 0) out.push(found('no-source', 'sources'));
  technique.sources.forEach((source, i) => {
    const n = words(source.sentence);
    if (n === 0) out.push(found('text-incomplete', `sources[${i}].sentence`));
    if (n > MAX_SENTENCE_WORDS) out.push(found('sentence-too-long', `sources[${i}].sentence`));
  });
  return out;
}

/**
 * Checks one technique: `name`, `watch` and `why` are complete in both
 * languages, there is at least one source and every source sentence has at
 * most 25 words. The shape itself is checked by `technique.schema.json`.
 *
 * @param technique - A technique, as in its JSON file.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateTechnique(technique: Technique): ContentResult {
  return contentResult(findings(technique));
}

/**
 * Checks a list of techniques: each one as `validateTechnique`, and no id twice
 * (the later one is reported as `duplicate-id`, path `[index].id`).
 *
 * @param list - All techniques, for example the shipped ones.
 * @returns `{ ok: true }` or the findings with paths prefixed by `[index].`.
 */
export function validateTechniques(list: readonly Technique[]): ContentResult {
  const seen = new Set<string>();
  const out: ContentFinding[] = [];
  list.forEach((technique, i) => {
    if (seen.has(technique.id)) out.push(found('duplicate-id', `[${i}].id`, technique.id));
    seen.add(technique.id);
    for (const f of findings(technique)) out.push({ ...f, path: `[${i}].${f.path}` });
  });
  return contentResult(out);
}
