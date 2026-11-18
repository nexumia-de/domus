// Types of the finder: what the stock allows. The input records are structural subsets of the
// stored shapes, so stored records can be passed as they are. Results are reasons, not scores.
import type { Amount, IngredientFacts } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';
import type { RatioTemplate, TemplateError } from '../ratios/types';
import type { PercentAmount } from '../scale/types';
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
  alwaysThere?: boolean;
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
  /** Lines that may be missing or short and still list the candidate. Default 0. */
  maxMissing?: number;
  /** The roles a dish is asked to fill, for `openRoles`. Default `DEFAULT_DISH_ROLES`. */
  dishRoles?: readonly string[];
}

export interface MakeableInput {
  ingredients: readonly MakeableIngredient[];
  components?: readonly MakeableComponent[];
  dishes?: readonly MakeableDish[];
  templates?: readonly RatioTemplate[];
  stock: readonly MakeableStockItem[];
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
}

/** One line (or slot, or role of a template) against the stock. */
export interface MakeableLineReport {
  index: number;
  /** What the line names; for a template role: its ingredient class, else the ingredient in stock. */
  ref?: ComponentRef;
  role?: string;
  optional: boolean;
  status: MakeableLineStatus;
  /** `stock`: a stock item; `made`: a sub-component made from its own lines. */
  source?: 'stock' | 'made';
  /** Stock items this line would use, earliest use-by first. */
  items: string[];
  substitution?: MakeableSubstitution;
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
