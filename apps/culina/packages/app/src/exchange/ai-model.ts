// The state of the AI import step, without any DOM: the names of every recipe of the answer
// (each asked once for the whole answer, as in the Cooklang step), the lines with their amount
// mode, role and guessed mark, and per recipe what the user confirms (docs/behaviour.md).
import {
  alternativeOf,
  componentRoles,
  isDishRecipe,
  readWrittenAmount,
  recipeLines,
  toGrams,
  unitFromWord,
  unitKind,
} from '@culina/engine';
import type { IngredientUse, RecipeAnswer, RecipeEntry, RecipeLineUse } from '@culina/engine';
import {
  defaultMode,
  keyOf,
  modesFor,
  nameRowsFor,
  type CookContext,
  type LineRow,
  type NamesModel,
} from './cook-model';

export interface AiComponentRow {
  /** The name of the component it becomes (text of the field). */
  name: string;
  role: string;
  /** For an alternative: the name of the component of the slot it may replace. */
  alternativeFor?: string;
}

export interface AiRecipeRow {
  entry: RecipeEntry;
  dish: boolean;
  /** Text of the name field. */
  name: string;
  /** Text of the portions field (a dish). */
  portions: string;
  /** Text of the output weight field in grams (one component). */
  yieldGrams: string;
  /** The written yield that has no field: a dish's goes into its note, a component's is shown. */
  yieldLeftOut?: string;
  components: AiComponentRow[];
  /** The occurrences of the recipe, in `recipeLines` order. */
  uses: RecipeLineUse[];
  /** The recipe's own lines (the same objects as in the answer's model), in `uses` order. */
  model: NamesModel;
}

export interface AiModel extends NamesModel {
  recipes: AiRecipeRow[];
}

/** An occurrence as the Cooklang step's line shape, so the line step can show it. */
const useOf = (use: RecipeLineUse, index: number): IngredientUse => ({
  type: 'ingredient',
  name: use.name,
  ...(use.quantity === undefined ? {} : { quantity: use.quantity }),
  ...(use.note === undefined ? {} : { note: use.note }),
  optional: false,
  reference: false,
  block: index,
});

/** A written yield as grams, when it is a mass of the unit table ("1 kg"); else undefined. */
export const yieldGramsOf = (written: string | undefined): number | undefined => {
  if (written === undefined) return undefined;
  const q = readWrittenAmount(written);
  const unit = q?.unit === undefined ? undefined : unitFromWord(q.unit);
  if (q?.value === undefined || unit === undefined || unitKind(unit) !== 'mass') return undefined;
  const g = toGrams({ value: q.value, unit });
  return g.ok ? Number(g.g.toPrecision(10)) : undefined;
};

export function buildAiModel(answer: RecipeAnswer, context: CookContext): AiModel {
  const perRecipe = answer.recipes.map((entry) => recipeLines(entry));
  const all = perRecipe.flat();
  const rows = nameRowsFor(
    all.map((u) => ({ name: u.name, reference: false })),
    context,
  );
  const facts = context.facts ?? {};
  const lines: LineRow[] = [];
  const recipes = answer.recipes.map((entry, r): AiRecipeRow => {
    const uses = perRecipe[r] ?? [];
    const own: LineRow[] = uses.map((use, i) => {
      const line: LineRow = {
        index: lines.length + i,
        use: useOf(use, i),
        key: keyOf({ name: use.name, reference: false }),
        mode: 'open',
        grams: '',
        role: use.role ?? '',
        ...(use.guessed ? { guessed: true } : {}),
      };
      return line;
    });
    lines.push(...own);
    const dish = isDishRecipe(entry);
    const grams = dish ? undefined : yieldGramsOf(entry.yield);
    const roles = componentRoles(entry);
    const alternatives = alternativeOf(entry);
    return {
      entry,
      dish,
      name: entry.title,
      portions: entry.persons === undefined ? '' : String(entry.persons),
      yieldGrams: grams === undefined ? '' : String(grams),
      ...(entry.yield !== undefined && grams === undefined ? { yieldLeftOut: entry.yield } : {}),
      components: entry.components.map((c, i) => ({
        name: c.name,
        role: roles[i] ?? 'main',
        ...(alternatives[i] === undefined ? {} : { alternativeFor: alternatives[i] }),
      })),
      uses,
      model: { rows, lines: own, facts },
    };
  });
  const model: AiModel = { rows, lines, facts, recipes };
  for (const line of lines) line.mode = defaultMode(modesFor(model, line, () => ({})));
  return model;
}

/** The lines of one component of a recipe, in order. */
export const componentLines = (recipe: AiRecipeRow, component: number): LineRow[] =>
  recipe.uses.flatMap((u, i) => (u.component === component ? (recipe.model.lines[i] ?? []) : []));

/** The line of a slot filled by an ingredient. */
export const slotLine = (recipe: AiRecipeRow, slot: number): LineRow | undefined => {
  const i = recipe.uses.findIndex((u) => u.slot === slot);
  return i < 0 ? undefined : recipe.model.lines[i];
};

/** The lines the AI marked as guessed, over the whole answer. */
export const guessedLines = (model: AiModel): LineRow[] => model.lines.filter((l) => l.guessed);

/** The source of a recipe in one line: "Title, Author, https://…, page 12". */
export const sourceText = (entry: RecipeEntry): string =>
  [entry.source?.title, entry.source?.author, entry.source?.url, entry.source?.where]
    .filter((p): p is string => p !== undefined && p.trim() !== '')
    .join(', ');

/** True when every recipe and every component of a dish has a name. */
export const aiNamed = (model: AiModel): boolean =>
  model.recipes.every(
    (r) => r.name.trim() !== '' && (!r.dish || r.components.every((c) => c.name.trim() !== '')),
  );
