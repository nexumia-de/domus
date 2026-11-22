// Handling rules the schema cannot state: texts complete, the sentence short, ids unique, and,
// when the context is given, the technique and the target known.
import { contentResult, found } from '../content/types';
import type { ContentFinding, ContentResult } from '../content/types';
import { isI18nText } from '../text/i18n';
import { levelFindings, MAX_SENTENCE_WORDS } from '../techniques/validate';
import type { HandlingRule } from './types';

/** What a rule is checked against; each part is optional. */
export interface HandlingContext {
  /** The known technique ids: the rule's `technique` must be one of them. */
  techniqueIds?: ReadonlySet<string>;
  /** The ingredient and group ids of the catalogue: the rule's `target` must be one of them. */
  ingredientIds?: ReadonlySet<string>;
}

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

function findings(rule: HandlingRule, context: HandlingContext): ContentFinding[] {
  const out: ContentFinding[] = [];
  for (const field of ['text', 'why'] as const) {
    if (!isI18nText(rule[field])) out.push(found('text-incomplete', field));
  }
  out.push(...levelFindings(rule.level));
  if (rule.sources.length === 0) out.push(found('no-source', 'sources'));
  rule.sources.forEach((source, i) => {
    const n = words(source.sentence);
    if (n === 0) out.push(found('text-incomplete', `sources[${i}].sentence`));
    if (n > MAX_SENTENCE_WORDS) out.push(found('sentence-too-long', `sources[${i}].sentence`));
  });
  if (context.techniqueIds !== undefined && !context.techniqueIds.has(rule.technique)) {
    out.push(found('unknown-technique', 'technique', rule.technique));
  }
  if (context.ingredientIds !== undefined && !context.ingredientIds.has(rule.target)) {
    out.push(found('unknown-ingredient', 'target', rule.target));
  }
  return out;
}

/**
 * Checks one handling rule: `text` and `why` complete in both languages, at least one source, every
 * source sentence at most 25 words and, when the context gives them, a known technique
 * (`unknown-technique`) and a known target (`unknown-ingredient`). The shape itself is checked by
 * `handling.schema.json`.
 *
 * @param rule - A rule, as in its JSON file.
 * @param context - The known technique ids and catalogue ids, each optional.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateHandlingRule(
  rule: HandlingRule,
  context: HandlingContext = {},
): ContentResult {
  return contentResult(findings(rule, context));
}

/**
 * Checks a list of rules: each one as `validateHandlingRule`, and no id twice (the later one is
 * reported as `duplicate-id`, path `[index].id`).
 *
 * @param list - All rules, for example the shipped ones.
 * @param context - As for `validateHandlingRule`.
 * @returns `{ ok: true }` or the findings with paths prefixed by `[index].`.
 */
export function validateHandlingRules(
  list: readonly HandlingRule[],
  context: HandlingContext = {},
): ContentResult {
  const seen = new Set<string>();
  const out: ContentFinding[] = [];
  list.forEach((rule, i) => {
    if (seen.has(rule.id)) out.push(found('duplicate-id', `[${i}].id`, rule.id));
    seen.add(rule.id);
    for (const f of findings(rule, context)) out.push({ ...f, path: `[${i}].${f.path}` });
  });
  return contentResult(out);
}
