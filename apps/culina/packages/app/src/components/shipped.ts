// The components of the shipped dishes and bases as the Components screen lists and shows them:
// read-only, each with the dish it belongs to. A shipped component is addressed as
// `#/components/<classic id>.<component id>`; ids are slugs or `u-` plus a UUID and never hold a
// dot, so the key cannot meet an own id or a word of the router (`new`). Amounts and steps come
// from the dish's own views (`dishView`, `cookView`, both through `deriveClassic`): the app does
// no arithmetic of its own. Pure: no DOM.
import { componentsReached, pickText, wantedLines } from '@culina/engine';
import type { Classic, Lang, Technique } from '@culina/engine';
import { cookView, type StepView } from '../classics/cook-view';
import { dishView, type DishView, type LineView, type NameOf } from '../classics/dish-view';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The route parameter of a shipped component. */
export const shippedKey = (classicId: string, componentId: string): string =>
  `${classicId}.${componentId}`;

/** The classic and component of a route parameter, or undefined for an own id or anything else. */
export const parseShippedKey = (
  param: string,
): { classicId: string; componentId: string } | undefined => {
  const [classicId, componentId, ...rest] = param.split('.');
  if (rest.length > 0 || classicId === undefined || componentId === undefined) return undefined;
  return SLUG.test(classicId) && SLUG.test(componentId) ? { classicId, componentId } : undefined;
};

/** One shipped component in the list. */
export interface ShippedEntry {
  key: string;
  classicId: string;
  componentId: string;
  /** The component's name in the content language. */
  name: string;
  /** The name of the dish or base it belongs to. */
  dishName: string;
  role?: string;
}

/**
 * Every component of every shipped dish and base, a base's alternatives included; sorted by the
 * dish's name, then in the order of its file, so that the parts of one dish stand together.
 */
export const shippedEntries = (classics: readonly Classic[], lang: Lang): ShippedEntry[] => {
  const collator = new Intl.Collator(lang);
  return classics
    .map((classic) => ({ classic, dishName: pickText(classic.name, lang) }))
    .sort((a, b) => collator.compare(a.dishName, b.dishName))
    .flatMap(({ classic, dishName }) =>
      (classic.components ?? []).map((c) => ({
        key: shippedKey(classic.id, c.id),
        classicId: classic.id,
        componentId: c.id,
        name: pickText(c.name, lang),
        dishName,
        ...(c.role === undefined ? {} : { role: c.role }),
      })),
    );
};

/** What the screen of one shipped component shows. */
export interface ShippedView {
  key: string;
  name: string;
  role?: string;
  classicId: string;
  dishName: string;
  /** The portions of the dish the amounts are for. */
  portions: number;
  lines: LineView[];
  /** Per line: the key of the shipped component the line names, where it names one. */
  links: (string | undefined)[];
  /** The component's own steps, numbered from 1. */
  steps: StepView[];
  /** The dish's source, with the remarks narrowed to this component's lines and steps. */
  source: DishView;
  /** The names of the ingredients the catalogue lacks, in it or in a component it names: then it cannot be kept. */
  wanted: string[];
}

export type ShippedViewResult = { ok: true; view: ShippedView } | { ok: false; code: string };

/**
 * One component of a shipped dish for some portions of that dish.
 *
 * @param classic - The shipped dish or base.
 * @param componentId - The component's id in it.
 * @param portions - Portions of the dish, above zero.
 * @param lang - The content language.
 * @param nameOf - The name of a catalogue ingredient.
 * @param known - The techniques the app knows.
 * @param learned - The techniques the user marked as learned.
 * @returns The view, `unknown-component`, or the engine's error code.
 */
export function shippedView(
  classic: Classic,
  componentId: string,
  portions: number,
  lang: Lang,
  nameOf: NameOf,
  known: readonly Technique[],
  learned: ReadonlySet<string>,
): ShippedViewResult {
  const all = classic.components ?? [];
  const index = all.findIndex((c) => c.id === componentId);
  const source = all[index];
  if (source === undefined) return { ok: false, code: 'unknown-component' };
  const dish = dishView(classic, portions, lang, nameOf);
  if (!dish.ok) return dish;
  const cooked = cookView(classic, portions, lang, nameOf, known, learned);
  if (!cooked.ok) return cooked;
  // cookView lists the steps of every component in file order: this component's follow those before it.
  const before = all.slice(0, index).reduce((n, c) => n + (c.steps?.length ?? 0), 0);
  const ownSteps = source.steps ?? [];
  const steps = cooked.steps
    .slice(before, before + ownSteps.length)
    .map((step, i) => ({ ...step, number: i + 1 }));
  const lines = dish.view.components[index]?.lines ?? [];
  const links = source.lines.map((line) =>
    line.ref?.kind === 'component' ? shippedKey(classic.id, line.ref.id) : undefined,
  );
  const reached = componentsReached(classic, [componentId]);
  const inReach = new Set(all.flatMap((c, i) => (reached.has(c.id) ? [`components[${i}]`] : [])));
  const wanted = [
    ...new Set(
      wantedLines(classic)
        .filter((w) => inReach.has(w.path.split('.')[0] ?? ''))
        .map((w) => pickText(w.wanted, lang)),
    ),
  ];
  const remarks: DishView['sourceRemarks'] = {
    lines: lines
      .filter((l) => l.original !== undefined || l.sourceNote !== undefined)
      .map((l) => ({
        name: l.name,
        ...(l.original === undefined ? {} : { original: l.original }),
        ...(l.sourceNote === undefined ? {} : { remark: l.sourceNote }),
      })),
    steps: ownSteps.flatMap((step, i) =>
      step.sourceNote === undefined
        ? []
        : [{ number: i + 1, remark: pickText(step.sourceNote, lang) }],
    ),
  };
  return {
    ok: true,
    view: {
      key: shippedKey(classic.id, componentId),
      name: pickText(source.name, lang),
      ...(source.role === undefined ? {} : { role: source.role }),
      classicId: classic.id,
      dishName: dish.view.name,
      portions: dish.view.portions,
      lines,
      links,
      steps,
      source: { ...dish.view, sourceRemarks: remarks },
      wanted,
    },
  };
}
