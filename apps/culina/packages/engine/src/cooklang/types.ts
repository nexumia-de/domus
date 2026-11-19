// Types of the Cooklang reader and writer. Written from the specification
// (cooklang/spec, README.md and conventions.md, MIT), see docs/decisions/cooklang.md.

/** What `{500%g}` says. `value` is set only for a plain number or a fraction. */
export interface CookQuantity {
  /** The text before `%`, without a leading `=`. */
  text: string;
  value?: number;
  /** The text after `%`; absent when there is none. */
  unit?: string;
  /** `=` in front of the quantity: it does not scale in Cooklang. Culina has no such lock. */
  locked: boolean;
}

export interface CookIngredient {
  type: 'ingredient';
  /** The name as written; for a reference the last part of the path. */
  name: string;
  /** A reference to another recipe: the path as written, without `./`. */
  path?: string;
  quantity?: CookQuantity;
  /** The short preparation in `(…)` after the ingredient. */
  note?: string;
  optional: boolean;
  reference: boolean;
}

export interface CookCookware {
  type: 'cookware';
  name: string;
  optional: boolean;
}

export interface CookTimer {
  type: 'timer';
  name?: string;
  quantity?: CookQuantity;
}

export interface CookText {
  type: 'text';
  text: string;
}

export type Segment = CookText | CookIngredient | CookCookware | CookTimer;

/** A block of the body, in file order. */
export type Block =
  | { type: 'step'; segments: Segment[]; text: string }
  | { type: 'note'; text: string }
  | { type: 'section'; name: string };

export type MetaValue = string | string[];

export interface CooklangDocument {
  metadata: Record<string, MetaValue>;
  blocks: Block[];
}

/** An ingredient occurrence with where it stands. */
export interface IngredientUse extends CookIngredient {
  /** Index in `blocks`. */
  block: number;
  /** The name of the section it is in, if any. */
  section?: string;
}
