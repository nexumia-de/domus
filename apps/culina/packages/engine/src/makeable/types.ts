// Types of the finder: what the stock allows. The input records are structural subsets of the
// stored shapes, so stored records can be passed as they are. Results are reasons, not scores.
import type { Amount, IngredientFacts } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';
import type { RatioTemplate, TemplateError } from '../ratios/types';
import type { PercentAmount } from '../scale/types';
import type { Substitute } from '../substitutes/types';
import type { Versioned } from '../versions/types';

/** An ingredient of the tree; `roles` left out are inherited from the parent. */
export interface MakeableIngredient {
  id: string;
  parentId?: string;
  roles?: readonly string[];
}

/** A stock item as the finder reads it: amount, state and dates are optional. */
export interface MakeableStockItem {
  id: string;
  ref: ComponentRef;
  /** Absent: presence only. */
  amount?: Amount;
  /** Absent: unknown. */
  state?: FoodState;
  /** Kept for the shape of the stored item; not read (no use-by is derived from it). */
  preparedOn?: string;
  /** `YYYY-MM-DD`. */
  useBy?: string;
  /** Always there (salt, water): satisfies lines, never drives urgency. */
  always?: boolean;
}

/** A component line or dish slot, reduced to what the finder reads. */
export interface MakeableLine {
  ref: ComponentRef;
  amount?: Amount | PercentAmount;
  role?: string;
  state?: FoodState;
  /** The line never blocks. */
  optional?: boolean;
}

export interface MakeableComponent extends Versioned {
  name: string;
  /** What the component is in a dish (sauce, crunch, ...); read by `stockForRole`. */
  role?: string;
  percentBase?: string;
  lines: readonly MakeableLine[];
  yield?: { amount: { value: number; unit: 'g' | 'kg' | 'oz' | 'lb' }; source: string };
}

export interface MakeableDish extends Versioned {
  name: string;
  slots: readonly {
    role: string;
    ref: ComponentRef;
    amount?: Amount;
    optional?: boolean;
  }[];
}

export interface MakeableOptions {
  /** A line naming a leaf ingredient may take a sibling under the same parent. Default true. */
  siblingSubstitution?: boolean;
  /**
   * A stock item of a group (an ingredient with members below it) covers a line that names a
   * member, reported in the line's `through`. Default true.
   */
  groupInStock?: boolean;
  /** Lines that may be missing or short and still list the candidate. Default 0. */
  maxMissing?: number;
  /** The roles a dish is asked to fill, for `openRoles`. Default `DEFAULT_DISH_ROLES`. */
  dishRoles?: readonly string[];
}

/** What a whole food is made of, by ingredient id: a whole egg has a yolk and a white. Data, never a name match. */
export interface MakeablePart {
  /** The whole (an ingredient id); a stock item of it or below it covers each part. */
  whole: string;
  /** Ingredient ids of the parts; a line naming one of them exactly is covered. */
  parts: readonly string[];
}

export interface MakeableInput {
  ingredients: readonly MakeableIngredient[];
  components?: readonly MakeableComponent[];
  dishes?: readonly MakeableDish[];
  templates?: readonly RatioTemplate[];
  stock: readonly MakeableStockItem[];
  /**
   * Declared substitutes (what replaces an ingredient and what changes). A line that names an
   * ingredient may take stock of a substitute's `to` where nothing of its own and no sibling is
   * there; the report names the substitute and its effect. Absent: none.
   */
  substitutes?: readonly Substitute[];
  /**
   * Parts of whole foods. A line that names a part, where nothing of its own is in stock, is
   * covered by stock of the whole, with no amount (the whole's amount says nothing exact about
   * the part's). Absent: none.
   */
  parts?: readonly MakeablePart[];
  /** Today, `YYYY-MM-DD`, from the host. */
  today: string;
  /** Density and unit weight per ingredient id, for converting between units. */
  facts?: Readonly<Record<string, IngredientFacts | undefined>>;
  options?: MakeableOptions;
}

export type MakeableLineStatus =
  'have' | 'have-by-substitution' | 'have-amount-unknown' | 'short' | 'missing';

export interface MakeableSubstitution {
  /** The ingredient the line names. */
  asked: string;
  /** The ingredient in stock that stands in. */
  substitute: string;
  /** The stock item. */
  itemId: string;
  /** Set when a declared substitute stood in: its id, for the text of what changes. */
  effect?: string;
  /** With `effect`: its factor, if the source gives one; `need` of the line is then in the substitute's amount. */
  factor?: number;
}

/**
 * A line covered by stock that is not the line's own ingredient and is no substitute: a group in
 * stock above the member the line names (`group`), or a whole in stock whose part the line names
 * (`part`).
 */
export interface MakeableThrough {
  rule: 'group' | 'part';
  /** The ingredient the line names; for a template role: the member that carries the role. */
  asked: string;
  /** The ingredient of the stock item: the group or the whole. */
  inStock: string;
  /** The stock item. */
  itemId: string;
}

/** One line (or slot, or role of a template) against the stock. */
export interface MakeableLineReport {
  index: number;
  /** What the line names; for a template role: its ingredient class, else the ingredient in stock. */
  ref?: ComponentRef;
  role?: string;
  optional: boolean;
  status: MakeableLineStatus;
  /**
   * `stock`: a stock item; `made`: a sub-component made from its own lines; `kitchen`: water,
   * which every kitchen has (no item, never lacking, no role, not counted as a line that is there).
   */
  source?: 'stock' | 'made' | 'kitchen';
  /** Stock items this line would use, earliest use-by first. */
  items: string[];
  substitution?: MakeableSubstitution;
  /** Set when a group or a whole in stock covers the line. */
  through?: MakeableThrough;
  /** Needed, in the line's unit; absent for a line without a usable amount. */
  need?: Amount;
  /** Known stock in the line's unit, for `short` and `have-amount-unknown`. */
  have?: Amount;
  /** Items of the right ingredient whose state does not fit the line. */
  stateMismatch?: string[];
  /** The lines of a sub-component, when it is made or could not be made. */
  parts?: MakeableLineReport[];
  /** A made sub-component was scaled by need and recorded yield; otherwise one run as written. */
  scaled?: boolean;
}

export interface MakeableUrgency {
  useBy: string;
  /** Days from today; negative when past. */
  daysLeft: number;
  /** The stock item that sets it. */
  itemId: string;
}

export interface MakeableCandidate {
  kind: 'component' | 'dish' | 'template';
  id: string;
  name: string;
  /** No required line is missing or short. */
  complete: boolean;
  /** Required lines that are missing or short. */
  lacking: number;
  lines: MakeableLineReport[];
  /** Absent when no stock item with a use-by date is used. */
  urgency?: MakeableUrgency;
  /** Distinct roles of the lines that are there, sorted. */
  roles: string[];
  /** Stock items used, not counting always-there items, sorted. */
  usedItems: string[];
  substitutions: MakeableSubstitution[];
  /** Dishes only: the roles no slot has. */
  openRoles?: string[];
}

export interface MakeableUseUp {
  itemId: string;
  useBy: string;
  daysLeft: number;
  /** Candidates that use the item, in ranking order. */
  candidates: { kind: MakeableCandidate['kind']; id: string }[];
}

export type MakeableErrorCode = 'invalid-tree' | 'invalid-date' | 'cycle' | 'invalid-template';

export interface MakeableError {
  code: MakeableErrorCode;
  ids?: string[];
  itemId?: string;
  path?: string[];
  cause?: TemplateError;
}

export type MakeableResult =
  | { ok: true; candidates: MakeableCandidate[]; useUpFirst: MakeableUseUp[] }
  | { ok: false; error: MakeableError };

export interface RoleStockItem {
  itemId: string;
  ingredientId: string;
  useBy?: string;
}

export type StockForRoleResult =
  { ok: true; items: RoleStockItem[] } | { ok: false; error: MakeableError };
