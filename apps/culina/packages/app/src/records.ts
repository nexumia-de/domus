// The stored records the screens read, as the JSON schemas define them (packages/engine/schemas).
// Only the fields the screens use are typed; a record valid against its schema is accepted as is.
import type {
  Component,
  FactsByIngredient,
  StockItem,
  FoodState,
  IngredientFacts,
  IngredientYield,
} from '@culina/engine';
import type { NamesByLanguage } from './shared/names';

export interface IngredientRecord {
  id: string;
  name: string;
  parentId?: string;
  /** Names in other languages by language tag; `name` stays the canonical English name. */
  names?: NamesByLanguage;
  roles?: string[];
  yields?: IngredientYield[];
  shelfLife?: {
    state: FoodState;
    storage: 'pantry' | 'fridge' | 'freezer';
    days: number;
    source: string;
  }[];
  densityGPerMl?: { value: number; source: string };
  unitWeightG?: { value: number; source: string };
  note?: string;
}

/** The `version` object of a stored component or dish (data model, Version). */
export interface VersionInfo {
  /** The id of the first version. */
  family: string;
  /** The version edited, or the record a variation was made from. */
  parent?: string;
  date: string;
  change?: string;
  reason?: string;
}

/** A tasting note: a record of its own that refers to one version record. */
export interface TastingRecord {
  id: string;
  ref: { kind: 'component' | 'dish'; id: string };
  date: string;
  text: string;
}

/** A component record: the engine's `Component` plus the fields only the screens read. */
export interface ComponentRecord extends Component {
  name: string;
  /** The dish role it usually fills. */
  role?: string;
  templateId?: string;
  method?: string[];
  version: VersionInfo;
}

export interface SlotRecord {
  role: string;
  ref: { kind: 'ingredient' | 'component'; id: string };
  amount?: {
    value: number;
    unit:
      | 'g'
      | 'kg'
      | 'oz'
      | 'lb'
      | 'ml'
      | 'l'
      | 'tsp'
      | 'tbsp'
      | 'cup'
      | 'imp-floz'
      | 'imp-gill'
      | 'imp-pint'
      | 'imp-quart'
      | 'count';
  };
  optional?: boolean;
}

export interface DishRecord {
  id: string;
  name: string;
  portions?: number;
  slots: SlotRecord[];
  version: VersionInfo;
  note?: string;
}

/**
 * A stock record. Fields of other apps (`x-...`) are carried along: an edit changes a copy of the
 * stored record and never rebuilds it from the typed fields.
 */
export type StockRecord = StockItem & { [extra: `x-${string}`]: unknown };

export type { FoodState, IngredientFacts };

/** Everything the view logic reads: the components, the ingredient facts and names. */
export interface Notebook {
  components: readonly ComponentRecord[];
  facts: FactsByIngredient;
  ingredientName(id: string): string;
  ingredientYields(id: string): readonly IngredientYield[] | undefined;
}
