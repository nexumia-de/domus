// Turns a read Cooklang document and the user's decisions into a component record: version 1 of
// a new family. Pure: ids and the date come in as input.
import type { IngredientFacts } from '../amounts/types';
import type { ComponentLine } from '../components/types';
import { resolveAmount, type AmountErrorCode, type AmountMode } from './amount';
import { ingredientUses } from './parse';
import type { CooklangDocument } from './types';

/** What the user decided for one ingredient occurrence of the file. */
export interface LineDecision {
  /** The notebook ingredient or component the name means. */
  target: { kind: 'ingredient' | 'component'; id: string };
  amount: AmountMode;
  /** A role id, or none. */
  role?: string;
}

export interface ImportOptions {
  /** The new record's id; it is also the family. */
  id: string;
  name: string;
  /** Calendar day from the host's clock. */
  date: string;
  /** The text of the version's `change`, naming the file. */
  change: string;
  /** Set to make the record a variation of that version record. */
  parent?: string;
  /** Output weight in grams the user entered; none when left out. */
  yieldGrams?: number;
  /** Role whose mass is 100 percent, chosen among the line roles. */
  percentBase?: string;
  /** Density and unit weight per ingredient id. */
  facts(target: LineDecision['target']): IngredientFacts;
}

export type ImportErrorCode = AmountErrorCode | 'no-lines' | 'decision-count';

export type ImportResult =
  | {
      ok: true;
      /** A stored component record. */
      component: Record<string, unknown>;
      /** Indexes (in `ingredientUses` order) of the lines kept without an amount. */
      unmeasured: number[];
    }
  | { ok: false; error: { code: ImportErrorCode; index?: number } };

/** The note of a line: the short preparation and the quantity as written when it is not the amount. */
const noteOf = (prep: string | undefined, original: string | undefined): string | undefined => {
  const parts = [prep, original].filter((p): p is string => p !== undefined && p !== '');
  return parts.length === 0 ? undefined : parts.join(', ');
};

/**
 * @param doc - The parsed file.
 * @param decisions - One per ingredient occurrence, in `ingredientUses(doc)` order.
 * @param options - Ids, date, change text and what the user entered for the whole component.
 */
export function importComponent(
  doc: CooklangDocument,
  decisions: readonly LineDecision[],
  options: ImportOptions,
): ImportResult {
  const uses = ingredientUses(doc);
  if (uses.length === 0) return { ok: false, error: { code: 'no-lines' } };
  if (decisions.length !== uses.length) return { ok: false, error: { code: 'decision-count' } };
  const lines: ComponentLine[] = [];
  const unmeasured: number[] = [];
  for (const [index, use] of uses.entries()) {
    const decision = decisions[index] as LineDecision;
    const done = resolveAmount(use.quantity, decision.amount, options.facts(decision.target));
    if (!done.ok) return { ok: false, error: { code: done.error.code, index } };
    if (done.unmeasured) unmeasured.push(index);
    const note = noteOf(use.note, done.original);
    lines.push({
      ref: decision.target,
      ...(done.amount === undefined ? {} : { amount: done.amount }),
      ...(decision.role === undefined || decision.role === '' ? {} : { role: decision.role }),
      ...(note === undefined ? {} : { note }),
    });
  }
  const method = doc.blocks.flatMap((b) =>
    b.type === 'step' ? [b.text] : b.type === 'note' ? [b.text] : b.name === '' ? [] : [b.name],
  );
  const component = {
    id: options.id,
    name: options.name,
    ...(options.percentBase === undefined ? {} : { percentBase: options.percentBase }),
    lines,
    ...(options.yieldGrams === undefined
      ? {}
      : { yield: { amount: { value: options.yieldGrams, unit: 'g' }, source: 'user' } }),
    ...(method.filter((m) => m !== '').length === 0
      ? {}
      : { method: method.filter((m) => m !== '') }),
    version: {
      family: options.id,
      date: options.date,
      change: options.change,
      ...(options.parent === undefined ? {} : { parent: options.parent }),
    },
  };
  return { ok: true, component, unmeasured };
}
