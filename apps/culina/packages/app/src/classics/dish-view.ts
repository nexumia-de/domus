// What the dish screen shows for a classic and a number of portions. Every amount comes from
// `deriveClassic`; the app does no arithmetic of its own. Pure: no DOM, names come in as a function.
import { deriveClassic, pickText } from '@culina/engine';
import type { Classic, DerivedLine, DerivedRange, Lang } from '@culina/engine';
import { strings } from '../strings';
import { lineAmountText } from './amounts';

const t = strings.classics;

/** One ingredient line as shown. `amount` is absent when the source gives none. */
export interface LineView {
  key?: string;
  name: string;
  amount?: string;
  /** Written in place of an amount when there is none: "to taste". */
  unmeasured?: string;
  note?: string;
  original?: string;
  settled: boolean;
  optional: boolean;
}

export interface ComponentView {
  id: string;
  name: string;
  lines: LineView[];
}

export interface DishView {
  name: string;
  originalName: string;
  course: Classic['course'];
  vegetarian: boolean;
  source: Classic['source'];
  persons: { value: number; basis: 'stated' | 'settled' };
  portions: number;
  components: ComponentView[];
  /** The slots of the dish itself (what goes with the components). */
  slots: LineView[];
  settled: { what: string; value: string; reason: string }[];
  check: Classic['check'];
  note?: string;
}

export type DishViewResult = { ok: true; view: DishView } | { ok: false; code: string };

/** Resolves a catalogue ingredient id to a name. */
export type NameOf = (id: string) => string;

const rangeOf = (ranges: readonly DerivedRange[], componentId: string | undefined, index: number) =>
  ranges.find((r) => r.componentId === componentId && r.index === index);

/** A note that only says what "no amount" already says is not shown twice. */
const SAYS_NO_AMOUNT = /^(to taste|nach geschmack|as needed|nach bedarf)$/i;
const unmeasuredText = (note: string | undefined): string =>
  note !== undefined && /^(as needed|nach bedarf)$/i.test(note.trim()) ? t.asNeeded : t.toTaste;

/**
 * The view of a classic for some portions in a language.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions wanted, above zero.
 * @param lang - The content language.
 * @param nameOf - The name of a catalogue ingredient.
 * @returns The view, or the engine's error code (for example `invalid-portions`).
 */
export function dishView(
  classic: Classic,
  portions: number,
  lang: Lang,
  nameOf: NameOf,
): DishViewResult {
  const derived = deriveClassic(classic, { portions, lang });
  if (!derived.ok) return { ok: false, code: derived.error.code };
  const componentName = new Map(derived.components.map((c) => [c.id, c.name]));
  const nameFor = (line: Pick<DerivedLine, 'ref' | 'wanted'>): string => {
    if (line.wanted !== undefined) return line.wanted;
    if (line.ref?.kind === 'component') return componentName.get(line.ref.id) ?? line.ref.id;
    return line.ref === undefined ? '' : nameOf(line.ref.id);
  };
  const lineView = (
    line: DerivedLine,
    componentId: string | undefined,
    index: number,
    settled: boolean,
    optional: boolean,
  ): LineView => {
    const amount = lineAmountText(line, rangeOf(derived.ranges, componentId, index));
    return {
      ...(line.key === undefined ? {} : { key: line.key }),
      name: nameFor(line),
      ...(amount !== undefined
        ? { amount }
        : line.ref?.kind === 'component'
          ? {}
          : { unmeasured: unmeasuredText(line.note) }),
      ...(line.note === undefined || SAYS_NO_AMOUNT.test(line.note.trim())
        ? {}
        : { note: line.note }),
      ...(line.original === undefined ? {} : { original: line.original }),
      settled,
      optional,
    };
  };
  const components = derived.components.map((c, ci): ComponentView => {
    const source = classic.components?.[ci];
    return {
      id: c.id,
      name: c.name,
      lines: c.lines.map((line, j) =>
        lineView(line, c.id, j, source?.lines[j]?.settled === true, false),
      ),
    };
  });
  const slots = derived.dish.slots.map((slot, i) =>
    lineView(slot, undefined, i, classic.slots[i]?.settled === true, slot.optional === true),
  );
  return {
    ok: true,
    view: {
      name: derived.dish.name,
      originalName: classic.originalName,
      course: classic.course,
      vegetarian: classic.vegetarian,
      source: classic.source,
      persons: classic.persons,
      portions: derived.dish.portions,
      components,
      slots,
      settled: classic.settled.map(({ what, value, reason }) => ({ what, value, reason })),
      check: classic.check,
      ...(classic.note === undefined ? {} : { note: pickText(classic.note, lang) }),
    },
  };
}
