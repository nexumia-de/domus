// Validation of a classic across its fields and against the known techniques and ingredients:
// what the JSON Schema cannot state (cross references, units, settled values, complete texts).
import { contentResult, found } from '../content/types';
import type { ContentFinding, ContentResult } from '../content/types';
import { findCycles } from '../validate/graph';
import { isUnitId } from '../amounts/units';
import { stepFindings } from '../steps/validate';
import { isI18nText } from '../text/i18n';
import type { Technique } from '../techniques/types';
import type { Classic, SourceAmount } from './types';
import { resolveSourceUnit } from './units';
import { settledFindings } from './validate-settled';

/** What a classic is checked against. */
export interface ClassicContext {
  /** The known techniques: every step's technique must be one of them. */
  techniques: readonly Technique[];
  /** The ingredient ids of the catalogue; when given, every `ref` ingredient must be in it. */
  ingredientIds?: ReadonlySet<string>;
}

/** The ingredient fields of a line or slot, for the shared checks. */
interface Item {
  ref?: { kind: 'ingredient' | 'component'; id: string };
  wanted?: unknown;
  amount?: SourceAmount;
}

/**
 * Checks one classic: texts complete in both languages (names, `wanted`, notes, steps), component
 * ids unique and not `slots`, every component reference exists and none is circular or unused, every
 * ingredient id is in the catalogue (when `ingredientIds` is given), every unit resolves (the table or
 * the classic's `units`) and a defined unit is used and does not shadow a table unit, a component line
 * has a mass, a range ends above its start, every step's technique exists and its `uses` name lines,
 * and settled lines, settled persons and `settled` entries agree.
 *
 * @param classic - A classic, as in its JSON file (valid against `classic.schema.json`).
 * @param context - The techniques and, optionally, the catalogue's ingredient ids.
 * @returns `{ ok: true }` or `{ ok: false, error: { code: 'invalid', findings } }`.
 */
export function validateClassic(classic: Classic, context: ClassicContext): ContentResult {
  const out: ContentFinding[] = [];
  const componentIds = new Set<string>();
  const techniqueIds = new Set(context.techniques.map((t) => t.id));
  const used = new Set<string>();
  const text = (path: string, value: unknown): void => {
    if (!isI18nText(value)) out.push(found('text-incomplete', path));
  };
  text('name', classic.name);
  if (classic.note !== undefined) text('note', classic.note);

  const components = classic.components ?? [];
  components.forEach((c, i) => {
    if (componentIds.has(c.id)) out.push(found('duplicate-id', `components[${i}].id`, c.id));
    if (c.id === 'slots') out.push(found('reserved-id', `components[${i}].id`, c.id));
    componentIds.add(c.id);
  });

  const item = (path: string, it: Item): void => {
    if (it.wanted !== undefined) text(`${path}.wanted`, it.wanted);
    const ref = it.ref;
    if (ref?.kind === 'component') {
      if (!componentIds.has(ref.id)) out.push(found('unknown-component', `${path}.ref`, ref.id));
    } else if (ref !== undefined && context.ingredientIds && !context.ingredientIds.has(ref.id)) {
      out.push(found('unknown-ingredient', `${path}.ref`, ref.id));
    }
    const amount = it.amount;
    if (amount === undefined) return;
    const size = resolveSourceUnit(amount.unit, classic);
    if (size === undefined) out.push(found('unknown-unit', `${path}.amount.unit`, amount.unit));
    else {
      used.add(amount.unit);
      if (ref?.kind === 'component' && size.kind !== 'mass') {
        out.push(found('unit-kind', `${path}.amount.unit`, amount.unit));
      }
    }
    if (amount.max !== undefined && amount.max <= amount.value) {
      out.push(found('bad-range', `${path}.amount`));
    }
  };

  components.forEach((c, i) => {
    text(`components[${i}].name`, c.name);
    c.lines.forEach((line, j) => {
      item(`components[${i}].lines[${j}]`, line);
      if (line.note !== undefined) text(`components[${i}].lines[${j}].note`, line.note);
      if (line.sourceNote !== undefined) {
        text(`components[${i}].lines[${j}].sourceNote`, line.sourceNote);
      }
      if (line.amountWord !== undefined && line.amount !== undefined) {
        out.push(found('amount-word', `components[${i}].lines[${j}].amountWord`));
      }
    });
    out.push(...stepFindings(`components[${i}]`, c, techniqueIds, { textRequired: true }));
  });
  classic.slots.forEach((slot, i) => item(`slots[${i}]`, slot));

  for (const [word] of Object.entries(classic.units ?? {})) {
    if (isUnitId(word)) out.push(found('unit-shadows', `units.${word}`, word));
    else if (!used.has(word)) out.push(found('unused-unit', `units.${word}`, word));
  }

  const subs = (id: string): string[] =>
    (components.find((c) => c.id === id)?.lines ?? []).flatMap((l) =>
      l.ref?.kind === 'component' ? [l.ref.id] : [],
    );
  for (const ring of findCycles([...componentIds], subs)) {
    out.push(found('cycle', 'components', ring.join('>')));
  }
  const referenced = new Set([
    ...classic.slots.flatMap((s) => (s.ref?.kind === 'component' ? [s.ref.id] : [])),
    ...components.flatMap((c) =>
      c.lines.flatMap((l) => (l.ref?.kind === 'component' ? [l.ref.id] : [])),
    ),
  ]);
  components.forEach((c, i) => {
    if (!referenced.has(c.id)) out.push(found('unused-component', `components[${i}].id`, c.id));
  });

  out.push(...settledFindings(classic));
  return contentResult(out);
}
