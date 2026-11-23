// Types of the recipe import format (schemas/recipe-import.schema.json), the answer a language
// model of the user's choice writes from a recipe (docs/decisions/ai-prompt-import.md).
import schema from '../../schemas/recipe-import.schema.json';

export const RECIPE_FORMAT = 'culina-recipes';
export const RECIPE_FORMAT_VERSION = 1;

/** The schema itself, for the prompt that is generated from it and the tests. */
export const recipeImportSchema: Record<string, unknown> = schema as Record<string, unknown>;

export interface RecipeSource {
  title?: string;
  author?: string;
  url?: string;
  where?: string;
}

export interface RecipeLine {
  ingredient: string;
  amount?: string;
  guessed?: boolean;
  role?: string;
  note?: string;
}

export interface RecipeComponent {
  name: string;
  role?: string;
  lines: RecipeLine[];
  steps?: string[];
}

export interface RecipeSlot {
  role: string;
  component?: string;
  ingredient?: string;
  amount?: string;
  guessed?: boolean;
  optional?: boolean;
  alternatives?: string[];
}

export interface RecipeEntry {
  title: string;
  persons?: number;
  yield?: string;
  source?: RecipeSource;
  components: RecipeComponent[];
  slots?: RecipeSlot[];
  steps?: string[];
}

export interface RecipeAnswer {
  format: typeof RECIPE_FORMAT;
  formatVersion: typeof RECIPE_FORMAT_VERSION;
  recipes: RecipeEntry[];
}
