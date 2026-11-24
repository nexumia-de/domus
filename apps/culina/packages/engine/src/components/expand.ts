// Expands a component to its raw ingredients through any nesting depth.
// A line that uses g grams of a sub-component takes the fraction
// g / (the sub-component's yield) of that sub-component's own recipe.
import { componentLineGrams } from './lines';
import type {
  Component,
  ComponentLine,
  ComponentError,
  ExpandOptions,
  ExpandResult,
  FactsByIngredient,
  RawIngredient,
  UnconvertedLine,
  UnmeasuredLine,
} from './types';
import { runGrams } from './yield';

type Fail = { ok: false; error: ComponentError };
const fail = (error: ComponentError): Fail => ({ ok: false, error });

interface Walk {
  byId: Map<string, Component>;
  facts: FactsByIngredient;
  raw: Map<string, RawIngredient>;
  unmeasured: UnmeasuredLine[];
  unconverted: UnconvertedLine[];
  unweighed: string[];
  withoutYield: ExpandOptions['withoutYield'];
  withoutAmount: ExpandOptions['withoutAmount'];
  rawBy: ExpandOptions['rawBy'];
  notWeighedByLine: ExpandOptions['notWeighedByLine'];
}

/** The components a component names without an amount, where they are taken as one run each. */
const runLines = (w: Walk, component: Component, unmeasured: readonly number[]): string[] =>
  w.withoutAmount !== 'run'
    ? []
    : unmeasured.flatMap((index) => {
        const ref = (component.lines[index] as ComponentLine).ref;
        return ref.kind === 'component' ? [ref.id] : [];
      });

/**
 * What one run of a component weighs when it is taken as its input: its measured lines and, with
 * `withoutAmount: 'run'`, one run of each component it names without an amount, all the way down.
 */
function inputOf(w: Walk, component: Component, path: string[]): number | Fail {
  const lines = componentLineGrams(component, w.facts);
  if (!lines.ok) return lines;
  // A line that cannot be weighed leaves the run's weight unknown, not lighter.
  if (lines.unconverted.length > 0) {
    return fail({ code: 'no-yield', componentId: component.id, path });
  }
  let g = lines.inputG;
  for (const subId of runLines(w, component, lines.unmeasured)) {
    const sub = w.byId.get(subId);
    const at = [...path, subId];
    if (sub === undefined) return fail({ code: 'unknown-component', componentId: subId, path: at });
    if (path.includes(subId)) return fail({ code: 'cycle', path: at });
    const run = runGrams(sub, w.facts, w.withoutYield);
    if (!run.ok) return run;
    const subG = run.weighed ? run.g : inputOf(w, sub, at);
    if (typeof subG === 'object') return subG;
    g += subG ?? 0;
  }
  return g;
}

/** One run of a component in grams for scaling, noting a run taken as its input. */
function runOf(w: Walk, component: Component, path: string[]): number | Fail {
  const run = runGrams(component, w.facts, w.withoutYield);
  if (!run.ok) return run;
  let g = run.g;
  if (!run.weighed && w.withoutYield === 'input') {
    const input = inputOf(w, component, path);
    if (typeof input !== 'number') return input;
    g = input > 0 ? input : undefined;
  }
  if (g === undefined) return fail({ code: 'no-yield', componentId: component.id, path });
  if (!run.weighed && !w.unweighed.includes(component.id)) w.unweighed.push(component.id);
  return g;
}

/**
 * What one run of a component weighs where it is scaled, by the same rule as `expandComponent`
 * with the same options: its recorded yield; else, with `withoutYield: 'input'`, what goes in,
 * and with `withoutAmount: 'run'` that includes one run of each component it names without an
 * amount. So every reader that scales a run (the dish's total list, its ingredients, the cook
 * screen) divides by the same weight.
 *
 * With `notWeighedByLine` the run is weighed as for a line that names the component by mass.
 *
 * @returns `g`, or the error `expandComponent` would give (`no-yield`, `unknown-component`, …).
 */
export function runWeight(
  components: readonly Component[],
  id: string,
  factsByIngredient: FactsByIngredient = {},
  options: Omit<ExpandOptions, 'outputG' | 'rawBy'> = {},
): { ok: true; g: number } | Fail {
  const byId = new Map(components.map((c) => [c.id, c]));
  const top = byId.get(id);
  if (top === undefined) return fail({ code: 'unknown-component', componentId: id, path: [id] });
  const w: Walk = {
    byId,
    facts: factsByIngredient,
    raw: new Map(),
    unmeasured: [],
    unconverted: [],
    unweighed: [],
    withoutYield: options.withoutYield,
    withoutAmount: options.withoutAmount,
    rawBy: undefined,
    notWeighedByLine: options.notWeighedByLine,
  };
  const unweighable = notWeighedByLine(w, top, [id]);
  if (unweighable !== undefined) return unweighable;
  const g = runOf(w, top, [id]);
  return typeof g === 'number' ? { ok: true, g } : g;
}

/**
 * `no-yield` for a component named by mass whose run, without a recorded yield, holds an ingredient
 * of `notWeighedByLine` (kitchen water poured away); else undefined.
 */
function notWeighedByLine(w: Walk, component: Component, path: string[]): Fail | undefined {
  const ids = w.notWeighedByLine ?? [];
  if (ids.length === 0 || component.yield !== undefined) return undefined;
  const holds = component.lines.some((l) => l.ref.kind === 'ingredient' && ids.includes(l.ref.id));
  return holds ? fail({ code: 'no-yield', componentId: component.id, path }) : undefined;
}

/** Adds one run of `id` times `factor` to the walk; the error, if any. */
function walk(w: Walk, id: string, factor: number, stack: string[]): Fail | undefined {
  const component = w.byId.get(id) as Component;
  const lines = componentLineGrams(component, w.facts);
  if (!lines.ok) return lines;
  const runs = new Set(runLines(w, component, lines.unmeasured));
  for (const index of lines.unmeasured) {
    const ref = (component.lines[index] as ComponentLine).ref;
    if (ref.kind === 'component' && runs.has(ref.id)) continue;
    w.unmeasured.push({ path: [...stack, id], index, ref });
  }
  for (const { index, cause } of lines.unconverted) {
    const ref = (component.lines[index] as ComponentLine).ref;
    w.unconverted.push({ path: [...stack, id], index, ref, cause });
  }
  for (const line of lines.lines) {
    if (line.ref.kind === 'ingredient') {
      const key = JSON.stringify(
        w.rawBy === 'line' ? [...stack, id, line.index] : [line.ref.id, line.state, line.role],
      );
      const entry = w.raw.get(key) ?? {
        ingredientId: line.ref.id,
        ...(line.state !== undefined ? { state: line.state } : {}),
        ...(line.role !== undefined ? { role: line.role } : {}),
        g: 0,
      };
      entry.g += line.g * factor;
      w.raw.set(key, entry);
      continue;
    }
    const subId = line.ref.id;
    const path = [...stack, id, subId];
    if (!w.byId.has(subId)) return fail({ code: 'unknown-component', componentId: subId, path });
    if (stack.includes(subId) || subId === id) {
      return fail({ code: 'cycle', path });
    }
    const subComponent = w.byId.get(subId) as Component;
    const unweighable = notWeighedByLine(w, subComponent, path);
    if (unweighable !== undefined) return unweighable;
    const sub = runOf(w, subComponent, path);
    if (typeof sub !== 'number') return sub;
    const failed = walk(w, subId, (factor * line.g) / sub, [...stack, id]);
    if (failed) return failed;
  }
  // A component named without an amount: one run of it per run of this one (`withoutAmount`).
  for (const subId of runLines(w, component, lines.unmeasured)) {
    const path = [...stack, id, subId];
    if (!w.byId.has(subId)) return fail({ code: 'unknown-component', componentId: subId, path });
    if (stack.includes(subId) || subId === id) return fail({ code: 'cycle', path });
    const failed = walk(w, subId, factor, [...stack, id]);
    if (failed) return failed;
  }
  return undefined;
}

/**
 * The raw ingredients of a component, with every sub-component expanded.
 * Without `outputG` it is one run of the recipe as written; with it the
 * amounts are for that much output (factor = outputG over the component's
 * yield). Raw ingredients are aggregated by ingredient, state and role in
 * first-seen order (with `rawBy: 'line'`, one per line of the tree). Lines without amount anywhere in the tree are listed in
 * `unmeasured`, lines whose amount lacks a fact to convert it in
 * `unconverted`; neither is guessed. A component without a recorded yield
 * whose weight is needed is `no-yield`, or with `withoutYield: 'input'` taken
 * as weighing its input and listed in `unweighed`. A line naming a component
 * without an amount is `unmeasured`, or with `withoutAmount: 'run'` one run of
 * that component per run of the line's own (the rule of a shipped dish).
 *
 * @param components - All components that may be referenced.
 * @param id - The component to expand.
 * @param factsByIngredient - Density and unit weight per ingredient id.
 * @param options - `outputG`: the output weight wanted; `withoutYield`; `withoutAmount`; `rawBy`.
 * @returns `raw`, `rawG`, `unmeasured`, `unconverted`, `unweighed` and `factor`; or `unknown-component`, `cycle` (`path`), `duplicate-id`, `no-yield` (`componentId`, `path`), `invalid-value` or the errors of `componentLineGrams`.
 */
export function expandComponent(
  components: readonly Component[],
  id: string,
  factsByIngredient: FactsByIngredient = {},
  options: ExpandOptions = {},
): ExpandResult {
  const byId = new Map<string, Component>();
  for (const c of components) {
    if (byId.has(c.id)) return fail({ code: 'duplicate-id', componentId: c.id });
    byId.set(c.id, c);
  }
  const top = byId.get(id);
  if (top === undefined) return fail({ code: 'unknown-component', componentId: id, path: [id] });
  const { outputG } = options;
  const w: Walk = {
    byId,
    facts: factsByIngredient,
    raw: new Map(),
    unmeasured: [],
    unconverted: [],
    unweighed: [],
    withoutYield: options.withoutYield,
    withoutAmount: options.withoutAmount,
    rawBy: options.rawBy,
    notWeighedByLine: options.notWeighedByLine,
  };
  let factor = 1;
  if (outputG !== undefined) {
    if (typeof outputG !== 'number' || !Number.isFinite(outputG) || outputG <= 0) {
      return fail({ code: 'invalid-value', componentId: id, field: 'outputG' });
    }
    const own = runOf(w, top, [id]);
    if (typeof own !== 'number') return own;
    factor = outputG / own;
  }
  const failed = walk(w, id, factor, []);
  if (failed) return failed;
  const raw = [...w.raw.values()];
  return {
    ok: true,
    raw,
    rawG: raw.reduce((sum, r) => sum + r.g, 0),
    unmeasured: w.unmeasured,
    unconverted: w.unconverted,
    unweighed: w.unweighed,
    factor,
  };
}
