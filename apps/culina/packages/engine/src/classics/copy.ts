// The copy of a classic into the notebook: the records the app writes, version 1 of a new family,
// with their origin. Pure: ids and the date come in as input.
import type { Amount } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';
import type { Step } from '../steps/types';
import type { Lang } from '../text/i18n';
import { pickText } from '../text/i18n';
import { deriveClassic } from './derive';
import type { DerivedLine, DerivedSlot, DeriveErrorCode } from './derive';
import type { Classic, ClassicSource, Country, Course } from './types';
import { wantedLines } from './wanted';

export interface CopyOptions {
  /** Portions of the copy; default 2. */
  portions?: number;
  lang: Lang;
  /** The day of the copy, `YYYY-MM-DD`, from the host's clock. */
  date: string;
  /** Gives a new record id (`u-` plus a UUID); called once per record, components first. */
  newId: () => string;
  /** Notebook ingredient id per catalogue id, where the ingredient was adopted under another id. */
  ingredientIds?: Readonly<Record<string, string>>;
}

/** Where a copy came from; stored as the vendor field `x-origin`. */
export type Origin =
  | { classic: string; author: string; title: string; year: number; place: string; url: string }
  /** A copy of the project's own recipe: there is no source to name. */
  | { classic: string; own: true; year: number };

interface Version {
  family: string;
  date: string;
  change: string;
}

/** A component record, valid against `component.schema.json`. */
export interface CopiedComponent {
  id: string;
  name: string;
  role?: string;
  lines: {
    key?: string;
    ref: ComponentRef;
    amount?: Amount;
    role?: string;
    state?: FoodState;
    note?: string;
  }[];
  steps?: Step[];
  version: Version;
  'x-origin': Origin;
}

/** A dish record, valid against `dish.schema.json`. */
export interface CopiedDish {
  id: string;
  name: string;
  portions: number;
  /** The classic's course. */
  course: Course;
  /** The classic's country. */
  cuisine: Country;
  slots: { role: string; ref: ComponentRef; amount?: Amount; optional?: boolean }[];
  note?: string;
  version: Version;
  'x-origin': Origin;
}

export type CopyResult =
  | { ok: true; dish: CopiedDish; components: CopiedComponent[] }
  | {
      ok: false;
      error:
        | { code: DeriveErrorCode; path?: string; unit?: string }
        | { code: 'wanted-ingredient'; wanted: string[] };
    };

/** Trims binary noise (10 significant digits), as `deriveClassic` does. */
const clean = (n: number): number => Number(n.toPrecision(10));

/** A slot's amount for the whole dish as an amount per portion, which a dish record stores. */
const perPortion = (amount: Amount, portions: number): Amount => ({
  ...amount,
  value: clean(amount.value / portions),
});

/** The source's remark about a step stays with the classic; the copy is the cook's own. */
const withoutSourceNote = (step: Step): Step => {
  const { sourceNote, ...rest } = step;
  return sourceNote === undefined ? step : rest;
};

const noteOf = (
  note: string | undefined,
  line: DerivedLine,
  range?: string,
): string | undefined => {
  const parts = [note, line.original === undefined ? range : `(${line.original})`].filter(Boolean);
  return parts.length === 0 ? undefined : parts.join(' ');
};

/**
 * Copies a classic into the notebook as version 1 of a new family per record, with its origin.
 * The records are the derived dish and components for `portions` (amounts in grams, millilitres or
 * counts; a component's lines for all portions, a slot's amount per portion, as a dish record
 * reads it); component references point at the new ids. A line keeps the source's wording as a note
 * `(1 Pfund)` and a range as `(2-3 g)`. The dish keeps the classic's course, and its country as
 * the cuisine. The source is named in the version's `change` and in
 * `x-origin`. A classic that still has a `wanted` line cannot be copied: the notebook has no
 * ingredient for it.
 *
 * @param classic - A classic that passed `validateClassic`.
 * @param options - Portions, language, the day and the id source.
 * @returns The dish and component records, or the errors of `deriveClassic`, or
 * `wanted-ingredient` listing the names in the chosen language.
 */
export function copyClassic(classic: Classic, options: CopyOptions): CopyResult {
  const wanted = wantedLines(classic);
  if (wanted.length > 0) {
    const names = wanted.map((w) => pickText(w.wanted, options.lang));
    return { ok: false, error: { code: 'wanted-ingredient', wanted: names } };
  }
  const derived = deriveClassic(classic, {
    lang: options.lang,
    ...(options.portions === undefined ? {} : { portions: options.portions }),
  });
  if (!derived.ok) return derived;

  const source = classic.source;
  const name = pickText(classic.name, options.lang);
  const originOf = (id: string, from: ClassicSource): Origin =>
    from.own === true
      ? { classic: id, own: true, year: from.year }
      : {
          classic: id,
          author: from.author,
          title: from.title,
          year: from.year,
          place: from.place,
          url: from.url,
        };
  const origin = originOf(classic.id, source);
  // A component of a frame keeps the source of the recipe it was taken from.
  const fromOf = new Map(
    (classic.components ?? []).flatMap((c) => (c.from === undefined ? [] : [[c.id, c.from]])),
  );
  const componentOrigin = (id: string): Origin => {
    const from = fromOf.get(id);
    return from === undefined ? origin : originOf(from.recipe, from.source);
  };
  const change =
    source.own === true
      ? `Copied from the app's own recipe "${name}" (${source.year}).`
      : `Copied from the classic "${name}" (${source.author}, ${source.title}, ${source.year}).`;
  const idOf = new Map(derived.components.map((c) => [c.id, options.newId()]));
  const ref = (r: ComponentRef | undefined): ComponentRef => {
    // Exactly one of `ref` and `wanted` (schema), and wanted lines were refused above.
    const given = r as ComponentRef;
    return given.kind === 'component'
      ? { kind: 'component', id: idOf.get(given.id) as string }
      : { kind: 'ingredient', id: options.ingredientIds?.[given.id] ?? given.id };
  };
  const version = (id: string): Version => ({ family: id, date: options.date, change });

  const rangeText = (componentId: string | undefined, index: number): string | undefined => {
    const r = derived.ranges.find((x) => x.componentId === componentId && x.index === index);
    return r === undefined ? undefined : `(${r.min.value}-${r.max.value} ${r.min.unit})`;
  };
  const components = derived.components.map((c): CopiedComponent => {
    const id = idOf.get(c.id) as string;
    return {
      id,
      name: c.name,
      ...(c.role === undefined ? {} : { role: c.role }),
      lines: c.lines.map((line, j) => {
        const note = noteOf(line.note, line, rangeText(c.id, j));
        return {
          ...(line.key === undefined ? {} : { key: line.key }),
          ref: ref(line.ref),
          ...(line.amount === undefined ? {} : { amount: line.amount }),
          ...(line.role === undefined ? {} : { role: line.role }),
          ...(line.state === undefined ? {} : { state: line.state }),
          ...(note === undefined ? {} : { note }),
        };
      }),
      ...(c.steps.length === 0 ? {} : { steps: c.steps.map(withoutSourceNote) }),
      version: version(id),
      'x-origin': componentOrigin(c.id),
    };
  });
  const dishId = options.newId();
  const dish: CopiedDish = {
    id: dishId,
    name: derived.dish.name,
    portions: derived.dish.portions,
    course: classic.course,
    cuisine: classic.country,
    // A dish of the notebook reads a slot's amount per portion; the derived amount is for all of
    // them (until 2026-11-24 it was stored as it is, so a kept slot counted `portions` times).
    slots: derived.dish.slots.map((s: DerivedSlot) => ({
      role: s.role,
      ref: ref(s.ref),
      ...(s.amount === undefined ? {} : { amount: perPortion(s.amount, derived.dish.portions) }),
      ...(s.optional === undefined ? {} : { optional: s.optional }),
    })),
    ...(classic.note === undefined ? {} : { note: pickText(classic.note, options.lang) }),
    version: version(dishId),
    'x-origin': origin,
  };
  return { ok: true, dish, components };
}
