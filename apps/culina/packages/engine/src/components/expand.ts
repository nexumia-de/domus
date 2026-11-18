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
  UnmeasuredLine,
} from './types';
import { yieldGrams } from './yield';

type Fail = { ok: false; error: ComponentError };
const fail = (error: ComponentError): Fail => ({ ok: false, error });

interface Walk {
  byId: Map<string, Component>;
  facts: FactsByIngredient;
  raw: Map<string, RawIngredient>;
  unmeasured: UnmeasuredLine[];
}

/** Adds one run of `id` times `factor` to the walk; the error, if any. */
function walk(w: Walk, id: string, factor: number, stack: string[]): Fail | undefined {
  const component = w.byId.get(id) as Component;
  const lines = componentLineGrams(component, w.facts);
  if (!lines.ok) return lines;
  for (const index of lines.unmeasured) {
    const ref = (component.lines[index] as ComponentLine).ref;
    w.unmeasured.push({ path: [...stack, id], index, ref });
  }
  for (const line of lines.lines) {
    if (line.ref.kind === 'ingredient') {
      const key = JSON.stringify([line.ref.id, line.state, line.role]);
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
    const sub = yieldGrams(w.byId.get(subId) as Component);
    if (!sub.ok) return sub;
    if (sub.g === undefined) return fail({ code: 'no-yield', componentId: subId, path });
    const failed = walk(w, subId, (factor * line.g) / sub.g, [...stack, id]);
    if (failed) return failed;
  }
  return undefined;
}

/**
 * The raw ingredients of a component, with every sub-component expanded.
 * Without `outputG` it is one run of the recipe as written; with it the
 * amounts are for that much output (factor = outputG over the component's
 * yield). Raw ingredients are aggregated by ingredient, state and role in
 * first-seen order. Lines without amount anywhere in the tree are listed in
 * `unmeasured`, never guessed.
 *
 * @param components - All components that may be referenced.
 * @param id - The component to expand.
 * @param factsByIngredient - Density and unit weight per ingredient id.
 * @param options - `outputG`: the output weight wanted.
 * @returns `raw`, `rawG`, `unmeasured` and `factor`; or `unknown-component`, `cycle` (`path`), `duplicate-id`, `no-yield` (`componentId`, `path`), `invalid-value` or the errors of `componentLineGrams`.
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
  let factor = 1;
  if (outputG !== undefined) {
    if (typeof outputG !== 'number' || !Number.isFinite(outputG) || outputG <= 0) {
      return fail({ code: 'invalid-value', componentId: id, field: 'outputG' });
    }
    const own = yieldGrams(top);
    if (!own.ok) return own;
    if (own.g === undefined) return fail({ code: 'no-yield', componentId: id, path: [id] });
    factor = outputG / own.g;
  }
  const w: Walk = { byId, facts: factsByIngredient, raw: new Map(), unmeasured: [] };
  const failed = walk(w, id, factor, []);
  if (failed) return failed;
  const raw = [...w.raw.values()];
  return {
    ok: true,
    raw,
    rawG: raw.reduce((sum, r) => sum + r.g, 0),
    unmeasured: w.unmeasured,
    factor,
  };
}
