// Switching the entry between weight and percent, and choosing the reference ingredient. The
// arithmetic is the engine's (`convertComponentLines`); this file maps the form to the engine and back.
import { convertComponentLines, type ComponentLine, type FactsByIngredient } from '@culina/engine';
import { parseEntry } from '../shared/parse';
import { engineLine, type ComponentForm, type LineForm } from './component-form';

export type Outcome =
  | { ok: true; form: ComponentForm }
  | { ok: false; reason: 'cannot-convert' | 'no-base' | 'no-reference' };

/** Writes the engine's new amounts into the form's lines; lines it did not convert stay as typed. */
const apply = (form: ComponentForm, lines: readonly ComponentLine[]): LineForm[] =>
  form.lines.map((line, index) => {
    const amount = lines[index]?.amount;
    if (amount === undefined || parseEntry(line.amount).kind !== 'ok') return line;
    return { ...line, amount: String(amount.value), unit: amount.unit };
  });

const convert = (
  form: ComponentForm,
  to: 'weight' | 'percent',
  facts: FactsByIngredient,
): Outcome => {
  const done = convertComponentLines(
    {
      id: form.id,
      ...(form.percentBase === undefined ? {} : { percentBase: form.percentBase }),
      lines: form.lines.map(engineLine),
    },
    to,
    facts,
  );
  if (done.ok) return { ok: true, form: { ...form, lines: apply(form, done.lines) } };
  return {
    ok: false,
    reason: done.error.code === 'no-percent-base' ? 'no-base' : 'cannot-convert',
  };
};

/** The index of the first line that is a base line (grams, role = percentBase), or -1. */
export const referenceIndex = (form: ComponentForm): number =>
  form.percentBase === undefined
    ? -1
    : form.lines.findIndex((l) => l.role === form.percentBase && l.unit !== 'percent');

/**
 * Switches the way amounts are entered. To percent without a reference ingredient only changes
 * the mode: the lines stay weights until a reference is chosen.
 */
export const switchEntry = (
  form: ComponentForm,
  to: 'weight' | 'percent',
  facts: FactsByIngredient,
): Outcome => {
  if (form.entry === to) return { ok: true, form };
  if (to === 'percent' && referenceIndex(form) < 0) {
    return { ok: true, form: { ...form, entry: 'percent' } };
  }
  const converted = convert(form, to, facts);
  return converted.ok ? { ok: true, form: { ...converted.form, entry: to } } : converted;
};

/**
 * Makes the line at `index` the reference (100 %). The role is the line's own, else the
 * ingredient's first role (`roleOf`), else `base`. In percent entry every line is converted anew.
 */
export const chooseReference = (
  form: ComponentForm,
  index: number,
  facts: FactsByIngredient,
  roleOf: (ingredientId: string) => string | undefined,
): Outcome => {
  const line = form.lines[index];
  if (line === undefined || (line.ref === undefined && line.role === undefined)) {
    return { ok: false, reason: 'no-reference' };
  }
  let current = form;
  if (form.entry === 'percent' && referenceIndex(form) >= 0) {
    const back = convert(form, 'weight', facts);
    if (!back.ok) return back;
    current = back.form;
  }
  const role =
    line.role ?? (line.ref?.kind === 'ingredient' ? roleOf(line.ref.id) : undefined) ?? 'base';
  const lines = current.lines.map((l, i) => (i === index ? { ...l, role } : l));
  current = { ...current, percentBase: role, lines };
  if (form.entry !== 'percent') return { ok: true, form: current };
  const forth = convert(current, 'percent', facts);
  return forth.ok ? { ok: true, form: { ...forth.form, entry: 'percent' } } : forth;
};
