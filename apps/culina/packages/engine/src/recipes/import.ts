// Turns one recipe of an answer in the recipe import format, and the user's decisions for its
// lines, into records: one component, or a dish with its components (alternatives included, with
// the role of their slot). Pure: ids, the date and the texts come in as input. Nothing is guessed:
// a line whose amount cannot be used stays without one and keeps the written words as its note.
import type { IngredientFacts } from '../amounts/types';
import type { ComponentLine } from '../components/types';
import { resolveAmount, type AmountErrorCode } from '../cooklang/amount';
import type { LineDecision } from '../cooklang/import';
import type { CookQuantity } from '../cooklang/types';
import { normaliseName } from '../exchange/match';
import { readWrittenAmount } from './amount';
import type { RecipeEntry } from './types';

/** One ingredient occurrence of a recipe: a component's line, or a slot filled by an ingredient. */
export interface RecipeLineUse {
  name: string;
  quantity?: CookQuantity;
  /** The amount as written, when there is one. */
  written?: string;
  guessed: boolean;
  role?: string;
  note?: string;
  /** Index of the component whose line it is. */
  component?: number;
  /** Index of the slot it fills. */
  slot?: number;
}

/** The ingredient occurrences of a recipe: every component's lines in order, then ingredient slots. */
export function recipeLines(recipe: RecipeEntry): RecipeLineUse[] {
  const uses: RecipeLineUse[] = [];
  for (const [ci, c] of recipe.components.entries()) {
    for (const line of c.lines) {
      const quantity = line.amount === undefined ? undefined : readWrittenAmount(line.amount);
      uses.push({
        name: line.ingredient,
        ...(quantity === undefined ? {} : { quantity, written: line.amount }),
        guessed: line.guessed === true,
        ...(line.role === undefined ? {} : { role: line.role }),
        ...(line.note === undefined ? {} : { note: line.note }),
        component: ci,
      });
    }
  }
  for (const [si, slot] of (recipe.slots ?? []).entries()) {
    if (slot.ingredient === undefined) continue;
    const quantity = slot.amount === undefined ? undefined : readWrittenAmount(slot.amount);
    uses.push({
      name: slot.ingredient,
      ...(quantity === undefined ? {} : { quantity, written: slot.amount }),
      guessed: slot.guessed === true,
      slot: si,
    });
  }
  return uses;
}

/** A recipe becomes a dish when it states persons, has slots or more than one component. */
export const isDishRecipe = (recipe: RecipeEntry): boolean =>
  recipe.persons !== undefined ||
  recipe.components.length > 1 ||
  (recipe.slots !== undefined && recipe.slots.length > 0);

/** The slot role of the dish role used when the recipe names none. */
export const DEFAULT_RECIPE_ROLE = 'main';

/**
 * The role each component gets: the role of the slot it fills, or of the slot it is an
 * alternative for (the notebook's rule: an alternative is a component with the slot's role), else
 * its own `role`, else main.
 */
export function componentRoles(recipe: RecipeEntry): string[] {
  const bySlot = new Map<string, string>();
  for (const slot of recipe.slots ?? []) {
    if (slot.component !== undefined) bySlot.set(normaliseName(slot.component), slot.role);
    for (const a of slot.alternatives ?? []) {
      const key = normaliseName(a);
      if (!bySlot.has(key)) bySlot.set(key, slot.role);
    }
  }
  return recipe.components.map(
    (c) => bySlot.get(normaliseName(c.name)) ?? c.role ?? DEFAULT_RECIPE_ROLE,
  );
}

/** The names of the components that are alternatives (in no slot themselves), by index. */
export function alternativeOf(recipe: RecipeEntry): (string | undefined)[] {
  const filled = new Set(
    (recipe.slots ?? []).flatMap((s) =>
      s.component === undefined ? [] : [normaliseName(s.component)],
    ),
  );
  const alt = new Map<string, string>();
  for (const slot of recipe.slots ?? []) {
    for (const a of slot.alternatives ?? []) alt.set(normaliseName(a), slot.component ?? '');
  }
  return recipe.components.map((c) => {
    const key = normaliseName(c.name);
    return filled.has(key) ? undefined : alt.get(key);
  });
}

export interface RecipeComponentOptions {
  /** The new component's id; it is also its family. */
  id: string;
  name: string;
  /** Its role (`componentRoles`, or as the user changed it). */
  role: string;
}

export interface RecipeImportOptions {
  /** The id of the new dish, or of the component when the recipe is one component. */
  id: string;
  name: string;
  date: string;
  /** The text of every new version's `change` (it names the source). */
  change: string;
  /** For a dish: portions. */
  portions?: number;
  /** For a single component: its output weight in grams. */
  yieldGrams?: number;
  /** For a dish: its note (what the recipe states that has no field, such as a yield). */
  note?: string;
  /** One per component of the recipe, in order. */
  components: readonly RecipeComponentOptions[];
  /** Added to the note of a line whose amount the model marked as guessed. */
  guessedNote: string;
  facts(target: LineDecision['target']): IngredientFacts;
}

export type RecipeImportErrorCode =
  AmountErrorCode | 'decision-count' | 'component-count' | 'unknown-component';

export type RecipeImportResult =
  | {
      ok: true;
      kind: 'component';
      component: Record<string, unknown>;
      /** Indexes (in `recipeLines` order) of the lines kept without an amount. */
      unmeasured: number[];
    }
  | {
      ok: true;
      kind: 'dish';
      dish: Record<string, unknown>;
      components: Record<string, unknown>[];
      unmeasured: number[];
    }
  | { ok: false; error: { code: RecipeImportErrorCode; index?: number } };

const joinNote = (parts: (string | undefined)[]): string | undefined => {
  const kept = parts.filter((p): p is string => p !== undefined && p !== '');
  return kept.length === 0 ? undefined : kept.join(', ');
};

const version = (options: RecipeImportOptions, id: string) => ({
  family: id,
  date: options.date,
  change: options.change,
});

/**
 * @param recipe - One recipe of an answer that passed the schema and `checkRecipes`.
 * @param decisions - One per occurrence, in `recipeLines(recipe)` order.
 * @param options - Ids, date, texts and what the user confirmed.
 */
export function importRecipe(
  recipe: RecipeEntry,
  decisions: readonly LineDecision[],
  options: RecipeImportOptions,
): RecipeImportResult {
  const uses = recipeLines(recipe);
  if (decisions.length !== uses.length) return { ok: false, error: { code: 'decision-count' } };
  if (options.components.length !== recipe.components.length) {
    return { ok: false, error: { code: 'component-count' } };
  }
  const lines: ComponentLine[][] = recipe.components.map(() => []);
  const slotFill = new Map<number, { ref: LineDecision['target']; amount?: unknown }>();
  const unmeasured: number[] = [];
  for (const [index, use] of uses.entries()) {
    const decision = decisions[index] as LineDecision;
    const done = resolveAmount(use.quantity, decision.amount, options.facts(decision.target));
    if (!done.ok) return { ok: false, error: { code: done.error.code, index } };
    if (done.unmeasured) unmeasured.push(index);
    if (use.slot !== undefined) {
      slotFill.set(use.slot, {
        ref: decision.target,
        ...(done.amount === undefined ? {} : { amount: done.amount }),
      });
      continue;
    }
    const note = joinNote([use.note, done.original, use.guessed ? options.guessedNote : undefined]);
    lines[use.component ?? 0]?.push({
      ref: decision.target,
      ...(done.amount === undefined ? {} : { amount: done.amount }),
      ...(decision.role === undefined || decision.role === '' ? {} : { role: decision.role }),
      ...(note === undefined ? {} : { note }),
    });
  }

  const componentRecord = (i: number, extraSteps: readonly string[], dish: boolean) => {
    const own = options.components[i] as RecipeComponentOptions;
    const method = [...(recipe.components[i]?.steps ?? []), ...extraSteps];
    return {
      id: own.id,
      name: own.name,
      ...(dish || recipe.components[i]?.role !== undefined ? { role: own.role } : {}),
      lines: lines[i] ?? [],
      ...(!dish && options.yieldGrams !== undefined
        ? { yield: { amount: { value: options.yieldGrams, unit: 'g' }, source: 'user' } }
        : {}),
      ...(method.length === 0 ? {} : { method }),
      version: version(options, own.id),
    };
  };

  if (!isDishRecipe(recipe)) {
    return {
      ok: true,
      kind: 'component',
      component: componentRecord(0, recipe.steps ?? [], false),
      unmeasured,
    };
  }

  const idByName = new Map(
    recipe.components.map((c, i) => [normaliseName(c.name), options.components[i]?.id ?? '']),
  );
  const slots: Record<string, unknown>[] = [];
  if (recipe.slots === undefined || recipe.slots.length === 0) {
    for (const own of options.components) {
      slots.push({ role: own.role, ref: { kind: 'component', id: own.id } });
    }
  } else {
    for (const [si, slot] of recipe.slots.entries()) {
      const extra = slot.optional === true ? { optional: true } : {};
      if (slot.component !== undefined) {
        const id = idByName.get(normaliseName(slot.component));
        if (id === undefined) return { ok: false, error: { code: 'unknown-component', index: si } };
        slots.push({ role: slot.role, ref: { kind: 'component', id }, ...extra });
        continue;
      }
      const fill = slotFill.get(si);
      if (fill === undefined) return { ok: false, error: { code: 'decision-count', index: si } };
      slots.push({
        role: slot.role,
        ref: fill.ref,
        ...(fill.amount === undefined ? {} : { amount: fill.amount }),
        ...extra,
      });
    }
  }
  const components = recipe.components.map((_, i) => componentRecord(i, [], true));
  const steps = (recipe.steps ?? []).map((note) => ({ note }));
  const dish = {
    id: options.id,
    name: options.name,
    ...(options.portions === undefined ? {} : { portions: options.portions }),
    slots,
    ...(steps.length === 0 ? {} : { steps }),
    version: version(options, options.id),
    ...(options.note === undefined || options.note === '' ? {} : { note: options.note }),
  };
  return { ok: true, kind: 'dish', dish, components, unmeasured };
}
