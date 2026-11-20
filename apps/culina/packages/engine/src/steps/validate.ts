// Steps against their lines and the known techniques: what the schema cannot say.
import { contentResult, found } from '../content/types';
import type { ContentFinding, ContentResult } from '../content/types';
import { isI18nText } from '../text/i18n';
import type { Step } from './types';

/** The part of a component (stored or classic) that steps are checked against. */
export interface StepsOwner {
  lines: readonly { key?: string }[];
  steps?: readonly Step[];
}

/** What `stepFindings` checks beyond the techniques. */
export interface StepOptions {
  /** The ids of the known plain actions; left out, an action is not checked. */
  actionIds?: ReadonlySet<string>;
  /** True for a shipped dish: every step has its text in both languages. */
  textRequired?: boolean;
}

/**
 * Findings of one component's lines and steps; `base` is the path prefix
 * (for example `components[0]`). Used by `validateSteps` and `validateClassic`.
 */
export function stepFindings(
  base: string,
  owner: StepsOwner,
  techniqueIds: ReadonlySet<string>,
  options: StepOptions = {},
): ContentFinding[] {
  const out: ContentFinding[] = [];
  const keys = new Set<string>();
  owner.lines.forEach((line, i) => {
    if (line.key === undefined) return;
    if (keys.has(line.key)) out.push(found('duplicate-key', `${base}.lines[${i}].key`, line.key));
    keys.add(line.key);
  });
  (owner.steps ?? []).forEach((step, i) => {
    const at = `${base}.steps[${i}]`;
    if (step.text === undefined ? options.textRequired === true : !isI18nText(step.text)) {
      out.push(found('text-incomplete', `${at}.text`));
    }
    const said =
      step.text !== undefined ||
      step.technique !== undefined ||
      step.action !== undefined ||
      (step.note !== undefined && step.note.trim() !== '');
    if (!said) out.push(found('step-empty', at));
    if (step.technique !== undefined && step.action !== undefined) {
      out.push(found('technique-and-action', at, step.action));
    }
    if (
      step.action !== undefined &&
      options.actionIds !== undefined &&
      !options.actionIds.has(step.action)
    ) {
      out.push(found('unknown-action', `${at}.action`, step.action));
    }
    if (step.sourceNote !== undefined && !isI18nText(step.sourceNote)) {
      out.push(found('text-incomplete', `${at}.sourceNote`));
    }
    if (step.technique !== undefined && !techniqueIds.has(step.technique)) {
      out.push(found('unknown-technique', `${at}.technique`, step.technique));
    }
    (step.uses ?? []).forEach((key, j) => {
      if (!keys.has(key)) out.push(found('unknown-line', `${at}.uses[${j}]`, key));
    });
    for (const field of ['time', 'temperature'] as const) {
      const given = step[field];
      if (given?.to !== undefined && given.to <= given.value) {
        out.push(found('bad-range', `${at}.${field}`));
      }
    }
  });
  return out;
}

/**
 * Checks the steps of one component: a text, where there is one, complete in both
 * languages; every step says something (text, technique, action or note) and names a
 * technique or an action, not both; every `technique` and `action` exists, every line
 * named in `uses` exists (by `key`), line keys are unique, a range ends above its start.
 *
 * @param component - A component with `lines` and `steps`.
 * @param techniqueIds - The ids of the known techniques.
 * @param options - The known plain actions, and whether every step needs its text.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateSteps(
  component: StepsOwner,
  techniqueIds: ReadonlySet<string>,
  options: StepOptions = {},
): ContentResult {
  return contentResult(stepFindings('component', component, techniqueIds, options));
}
