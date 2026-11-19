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

/**
 * Findings of one component's lines and steps; `base` is the path prefix
 * (for example `components[0]`). Used by `validateSteps` and `validateClassic`.
 */
export function stepFindings(
  base: string,
  owner: StepsOwner,
  techniqueIds: ReadonlySet<string>,
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
    if (!isI18nText(step.text)) out.push(found('text-incomplete', `${at}.text`));
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
 * Checks the steps of one component: texts complete in both languages, every
 * `technique` exists, every line named in `uses` exists (by `key`), line keys
 * are unique, a range ends above its start.
 *
 * @param component - A component with `lines` and `steps`.
 * @param techniqueIds - The ids of the known techniques.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateSteps(
  component: StepsOwner,
  techniqueIds: ReadonlySet<string>,
): ContentResult {
  return contentResult(stepFindings('component', component, techniqueIds));
}
