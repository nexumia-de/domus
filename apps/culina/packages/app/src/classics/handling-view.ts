// Which handling rules show beside which step of a dish. The engine decides which rules apply to
// the ingredients (by the ingredient or a group above it, the dish's techniques as `used`, the
// learned skills left out); this only places them: each rule once, at the first step that uses its
// ingredient, and with the technique note never more than two notes on a step. A rule that does not
// fit waits for the next step that uses the same ingredient. Pure: no DOM.
import { handlingRules } from '@culina/engine';
import type { HandlingRule, TreeNode } from '@culina/engine';
import type { StepView } from './cook-view';

/** The most notes of any kind (technique note, handling rules) on one step. */
export const MAX_NOTES = 2;

export interface HandlingNote {
  rule: HandlingRule;
  /** The catalogue ingredient the rule matched. */
  ingredient: string;
  /** Its name on the line of the step. */
  name: string;
}

/**
 * The handling notes of each step.
 *
 * @param steps - The steps of the dish in order, with their lines and whether the technique note shows.
 * @param rules - The known handling rules.
 * @param tree - The catalogue's ingredients and groups with their parents.
 * @param learned - Technique ids the user marked as learned: their rules are left out.
 * @returns The notes by index in `steps`; steps without a note are absent.
 */
export function handlingNotes(
  steps: readonly StepView[],
  rules: readonly HandlingRule[],
  tree: readonly TreeNode[],
  learned: ReadonlySet<string>,
): Map<number, HandlingNote[]> {
  const out = new Map<number, HandlingNote[]>();
  const used = new Set(steps.flatMap((s) => (s.technique === undefined ? [] : [s.technique.id])));
  const ingredients = steps.flatMap((s) => s.lines.flatMap((l) => l.ingredient ?? []));
  const found = handlingRules(ingredients, rules, tree, learned, { used });
  if (!found.ok) return out;
  const waiting = [...found.rules];
  steps.forEach((step, index) => {
    let room = MAX_NOTES - (step.note ? 1 : 0);
    for (const entry of [...waiting]) {
      if (room <= 0) break;
      const line = step.lines.find((l) => l.ingredient === entry.ingredient);
      if (line === undefined) continue;
      waiting.splice(waiting.indexOf(entry), 1);
      room -= 1;
      out.set(index, [
        ...(out.get(index) ?? []),
        { rule: entry.rule, ingredient: entry.ingredient, name: line.name },
      ]);
    }
  });
  return out;
}
