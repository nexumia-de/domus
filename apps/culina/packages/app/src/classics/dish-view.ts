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
  /** The catalogue ingredient of the line; absent for a component or a wanted name. */
  ingredient?: string;
  name: string;
  amount?: string;
  /** Written in place of an amount only where the source says "to taste" or "as needed"; a line without an amount and without it shows its name alone. */
  amountWord?: string;
  /** Cooking help: shown with the line and when cooking. */
  note?: string;
  /** A remark about the source: shown only in the dish's source section. */
  sourceNote?: string;
  /** The source's own wording of the amount: shown only in the dish's source section. */
  original?: string;
  settled: boolean;
  optional: boolean;
}

export interface ComponentView {
  id: string;
  name: string;
  lines: LineView[];
}

/** What the source section lists apart from the one-line source: remarks about lines and steps. */
export interface SourceRemarks {
  lines: { name: string; original?: string; remark?: string }[];
  steps: { number: number; remark: string }[];
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
  check: Classic['check'];
  sourceRemarks: SourceRemarks;
  note?: string;
  /** Only for a frame: its parts, each with the recipe it is and that recipe's source. */
  frameParts?: { name: string; recipe: string; source: Classic['source'] }[];
}

export type DishViewResult = { ok: true; view: DishView } | { ok: false; code: string };

/** Resolves a catalogue ingredient id to a name. */
export type NameOf = (id: string) => string;

const rangeOf = (ranges: readonly DerivedRange[], componentId: string | undefined, index: number) =>
  ranges.find((r) => r.componentId === componentId && r.index === index);

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
      ...(line.ref?.kind === 'ingredient' ? { ingredient: line.ref.id } : {}),
      name: nameFor(line),
      ...(amount !== undefined || line.amountWord === undefined
        ? {}
        : { amountWord: line.amountWord === 'as-needed' ? t.asNeeded : t.toTaste }),
      ...(amount === undefined ? {} : { amount }),
      ...(line.note === undefined ? {} : { note: line.note }),
      ...(line.sourceNote === undefined ? {} : { sourceNote: line.sourceNote }),
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
  const remarks: SourceRemarks = {
    lines: [...components.flatMap((c) => c.lines), ...slots]
      .filter((l) => l.original !== undefined || l.sourceNote !== undefined)
      .map((l) => ({
        name: l.name,
        ...(l.original === undefined ? {} : { original: l.original }),
        ...(l.sourceNote === undefined ? {} : { remark: l.sourceNote }),
      })),
    steps: derived.components
      .flatMap((c) => c.steps)
      .flatMap((step, i) =>
        step.sourceNote === undefined
          ? []
          : [{ number: i + 1, remark: pickText(step.sourceNote, lang) }],
      ),
  };
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
      check: classic.check,
      sourceRemarks: remarks,
      ...(classic.note === undefined ? {} : { note: pickText(classic.note, lang) }),
      ...(classic.frame === true
        ? {
            frameParts: (classic.components ?? []).flatMap((c) =>
              c.from === undefined
                ? []
                : [
                    {
                      name: pickText(c.from.name, lang),
                      recipe: c.from.recipe,
                      source: c.from.source,
                    },
                  ],
            ),
          }
        : {}),
    },
  };
}
