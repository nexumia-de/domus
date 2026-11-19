// A classic: a shipped dish of one named source, one file per dish. Never stored. Its amounts are
// as the source gives them, in the source's own unit words; the engine derives grams and portions.
import type { ComponentRef, FoodState } from '../components/types';
import type { Step } from '../steps/types';
import type { I18nText } from '../text/i18n';

export type Country = 'de' | 'it' | 'fr' | 'es';

export type Course =
  'starter' | 'soup' | 'main' | 'side' | 'dessert' | 'baking' | 'sauce' | 'breakfast' | 'snack';

/** An amount as the source gives it: `value`, or a range from `value` to `max`; `unit` is an id of the unit table or a word of `units`. */
export interface SourceAmount {
  value: number;
  max?: number;
  unit: string;
  /** The short original wording, for example `1 Pfund`. */
  original?: string;
}

/** A source unit word that is not in the unit table: its size and where the equivalence was read. */
export interface ClassicUnit {
  kind: 'mass' | 'volume' | 'count';
  /** Grams (mass), millilitres (volume) or pieces (count) in one unit of the word. */
  factor: number;
  read: string;
}

/** An ingredient is a catalogue ingredient or a component (`ref`), or, while the catalogue lacks it, a `wanted` name. */
interface Ingredient {
  key?: string;
  ref?: ComponentRef;
  wanted?: I18nText;
  amount?: SourceAmount;
  /** True when we settled the amount; an entry of `settled` explains it. */
  settled?: true;
}

export interface ClassicLine extends Ingredient {
  role?: string;
  state?: FoodState;
  note?: I18nText;
}

export interface ClassicSlot extends Ingredient {
  role: string;
  optional?: boolean;
}

export interface ClassicComponent {
  id: string;
  name: I18nText;
  role?: string;
  lines: readonly ClassicLine[];
  steps?: readonly Step[];
}

/** Something we settled where the source is vague; `target` is `persons` or `<component id>/<line key>` (`slots/<key>` for a slot). */
export interface Settled {
  what: string;
  value: string;
  reason: string;
  target?: string;
}

export interface Classic {
  id: string;
  name: I18nText;
  originalName: string;
  country: Country;
  vegetarian: boolean;
  course: Course;
  source: {
    author: string;
    title: string;
    year: number;
    place: string;
    url: string;
    licence?: string;
  };
  persons: { value: number; basis: 'stated' | 'settled' };
  units?: Readonly<Record<string, ClassicUnit>>;
  components?: readonly ClassicComponent[];
  slots: readonly ClassicSlot[];
  settled: readonly Settled[];
  check: { method: 'page-image' | 'second-edition' | 'second-reader'; note: string };
  note?: I18nText;
}
