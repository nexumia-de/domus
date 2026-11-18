// The stored records the screens read, as the JSON schemas define them (packages/engine/schemas).
// Only the fields the screens use are typed; a record valid against its schema is accepted as is.
import type {
  Component,
  FactsByIngredient,
  FoodState,
  IngredientFacts,
  IngredientYield,
} from '@culina/engine';

export interface IngredientRecord {
  id: string;
  name: string;
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

export interface VersionInfo {
  family: string;
  date: string;
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
    unit: 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'tsp' | 'tbsp' | 'cup' | 'count';
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

export type { FoodState, IngredientFacts };

/** Everything the view logic reads: the components, the ingredient facts and names. */
export interface Notebook {
  components: readonly ComponentRecord[];
  facts: FactsByIngredient;
  ingredientName(id: string): string;
  ingredientYields(id: string): readonly IngredientYield[] | undefined;
}
