// What the user can decide for the amount of one imported line, and what each choice gives.
// Nothing is guessed: a line the file does not measure in a way Culina can use stays without an
// amount and keeps the original text as its note.
import { toGrams } from '../amounts/convert';
import { unitKind } from '../amounts/units';
import type { Amount, IngredientFacts } from '../amounts/types';
import { unitFromWord } from './units';
import type { CookQuantity } from './types';

/**
 * - `given`: the amount as the file says it (a number and a unit Culina knows).
 * - `grams`: the amount the user weighed.
 * - `facts`: volume or count turned into grams with the ingredient's density or unit weight.
 * - `open`: no amount; the line is kept and reported as unmeasured.
 */
export type AmountMode =
  { mode: 'given' } | { mode: 'grams'; grams: number } | { mode: 'facts' } | { mode: 'open' };

export type AmountErrorCode = 'unreadable' | 'needs-facts' | 'invalid-grams';

export interface AmountResult {
  amount?: Amount;
  unmeasured: boolean;
  /** The quantity as written (`2 cups`), kept in the note when it is not the amount itself. */
  original?: string;
}

/** The quantity as written in the file: its text and unit. */
export const quantityText = (q: CookQuantity | undefined): string =>
  q === undefined ? '' : [q.text, q.unit].filter((p) => p !== undefined && p !== '').join(' ');

/** The amount the file states, when it is a number and a unit Culina knows. */
export function givenAmount(q: CookQuantity | undefined): Amount | undefined {
  if (q?.value === undefined || !(q.value > 0)) return undefined;
  const unit = unitFromWord(q.unit);
  return unit === undefined ? undefined : { value: q.value, unit };
}

/** The modes that make sense for a quantity, in the order the import step offers them. */
export function availableModes(
  q: CookQuantity | undefined,
  facts: IngredientFacts,
): AmountMode['mode'][] {
  const given = givenAmount(q);
  const modes: AmountMode['mode'][] = [];
  if (given !== undefined) modes.push('given');
  if (given !== undefined && unitKind(given.unit) !== 'mass') {
    const needed = unitKind(given.unit) === 'volume' ? facts.densityGPerMl : facts.unitWeightG;
    if (needed !== undefined) modes.push('facts');
  }
  modes.push('grams', 'open');
  return modes;
}

/**
 * @param q - The quantity of the Cooklang ingredient, if any.
 * @param choice - What the user decided.
 * @param facts - Density and unit weight of the chosen ingredient.
 */
export function resolveAmount(
  q: CookQuantity | undefined,
  choice: AmountMode,
  facts: IngredientFacts,
): ({ ok: true } & AmountResult) | { ok: false; error: { code: AmountErrorCode } } {
  const written = quantityText(q);
  const original = written === '' ? {} : { original: written };
  if (choice.mode === 'open') return { ok: true, unmeasured: true, ...original };
  if (choice.mode === 'grams') {
    return Number.isFinite(choice.grams) && choice.grams > 0
      ? { ok: true, amount: { value: choice.grams, unit: 'g' }, unmeasured: false, ...original }
      : { ok: false, error: { code: 'invalid-grams' } };
  }
  const given = givenAmount(q);
  if (given === undefined) return { ok: false, error: { code: 'unreadable' } };
  if (choice.mode === 'given') return { ok: true, amount: given, unmeasured: false };
  const grams = toGrams(given, facts);
  if (!grams.ok) return { ok: false, error: { code: 'needs-facts' } };
  return {
    ok: true,
    amount: { value: Number(grams.g.toPrecision(10)), unit: 'g' },
    unmeasured: false,
    original: written,
  };
}
