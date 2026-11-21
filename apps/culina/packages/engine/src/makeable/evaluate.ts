// One line against the stock, and a list of lines (a component, a dish, a made sub-component).
// Order of tiers: the line's own items (exact, descendant, same component family), then for a
// component a made sub-component, for an ingredient a group in stock above it, then a whole whose
// part it is, then for a leaf ingredient a sibling, then a declared substitute. Water (an ingredient
// with the role water) is the kitchen's and never asked.
// A sibling never changes the needed amount; a declared substitute does only by its own factor
// (where the source gives one). Both are consulted only where the own tier has nothing.
import { toGrams } from '../amounts/convert';
import type { Amount } from '../amounts/types';
import type { ComponentRef, FoodState } from '../components/types';
import { yieldGrams } from '../components/yield';
import { scaleByFactor } from '../scale/scale';
import { compareStock } from './amount';
import type { Compared } from './amount';
import { isKitchen } from './context';
import type { Context, Item } from './context';
import { declaredItems, eligibleItems, groupItems, partItems, siblingItems } from './eligible';
import type {
  MakeableLineReport,
  MakeableLineStatus,
  MakeableComponent,
  MakeableError,
} from './types';

export type Fail = { ok: false; error: MakeableError };

/** A line with the amount it needs now (scaled for a made sub-component). */
export interface LineSpec {
  index: number;
  ref: ComponentRef;
  amount?: Amount;
  role?: string;
  state?: FoodState;
  optional: boolean;
}

/** Missing or short: the statuses that count as a lacking line. */
export const lacks = (status: MakeableLineStatus): boolean =>
  status === 'missing' || status === 'short';

const ids = (items: readonly Item[]): string[] => items.map((i) => i.id);

/** Compares non-always items; an always-there item covers what they cannot. */
function resolveTier(
  ctx: Context,
  items: readonly Item[],
  need: Amount | undefined,
  askedId: string,
): Compared {
  const normal = items.filter((i) => !i.always);
  const always = items.filter((i) => i.always);
  if (normal.length > 0) {
    const compared = compareStock(ctx, normal, need, askedId);
    if (compared.status === 'have' || always.length === 0) return compared;
  }
  return { status: 'have', used: always };
}

function flatSubstituted(reports: readonly MakeableLineReport[]): boolean {
  return reports.some(
    (r) =>
      r.substitution !== undefined ||
      (r.parts !== undefined && r.source === 'made' && flatSubstituted(r.parts)),
  );
}

type Made = { ok: true; reports: MakeableLineReport[]; scaled: boolean } | Fail;

/** Lines of a sub-component for the amount needed: scaled by recorded yield, else one run as written. */
function makeComponent(
  ctx: Context,
  comp: MakeableComponent,
  need: Amount | undefined,
  stack: readonly string[],
): Made {
  if (stack.includes(comp.id))
    return { ok: false, error: { code: 'cycle', path: [...stack, comp.id] } };
  let lines = comp.lines.map((l, i) => ({ id: String(i), role: l.role, amount: l.amount }));
  let scaled = false;
  const needG = need === undefined ? undefined : toGrams(need);
  const yielded = yieldGrams(comp);
  if (needG?.ok === true && yielded.ok && yielded.g !== undefined) {
    const result = scaleByFactor(lines, needG.g / yielded.g);
    if (result.ok) {
      lines = result.lines.map((l) => ({ id: l.id, role: l.role, amount: l.amount }));
      scaled = true;
    }
  }
  const specs: LineSpec[] = comp.lines.map((l, index) => {
    const amount = lines[index]?.amount;
    return {
      index,
      ref: l.ref,
      ...(amount !== undefined && amount.unit !== 'percent' ? { amount } : {}),
      ...(l.role !== undefined ? { role: l.role } : {}),
      ...(l.state !== undefined ? { state: l.state } : {}),
      optional: l.optional === true,
    };
  });
  const reports = evaluateLines(ctx, specs, [...stack, comp.id]);
  return reports.ok ? { ok: true, reports: reports.reports, scaled } : reports;
}

/** One line against the stock; fails only on a cycle of components. */
export function evaluateLine(
  ctx: Context,
  spec: LineSpec,
  stack: readonly string[],
): MakeableLineReport | Fail {
  const want = { ref: spec.ref, ...(spec.state !== undefined ? { state: spec.state } : {}) };
  const askedId = ctx.headId(spec.ref);
  const own = eligibleItems(ctx, want);
  const head: Omit<MakeableLineReport, 'status' | 'items'> = {
    index: spec.index,
    ref: { kind: spec.ref.kind, id: askedId },
    ...(spec.role !== undefined ? { role: spec.role } : {}),
    optional: spec.optional,
    ...(spec.amount !== undefined ? { need: spec.amount } : {}),
    ...(own.stateMismatch.length > 0 ? { stateMismatch: ids(own.stateMismatch) } : {}),
  };
  const stock = (c: Compared, extra: Partial<MakeableLineReport> = {}): MakeableLineReport => ({
    ...head,
    status: c.status,
    source: 'stock',
    items: ids(c.used),
    ...(c.have !== undefined ? { have: c.have } : {}),
    ...extra,
  });

  // Water: stock of it is read as for any line; what it cannot cover, the kitchen does.
  const kitchen = spec.ref.kind === 'ingredient' && isKitchen(ctx, askedId);
  const fromKitchen: MakeableLineReport = { ...head, status: 'have', source: 'kitchen', items: [] };
  if (own.items.length > 0) {
    const c = resolveTier(ctx, own.items, spec.amount, askedId);
    return kitchen && c.status !== 'have' ? fromKitchen : stock(c);
  }
  if (kitchen) return fromKitchen;

  const group = groupItems(ctx, want);
  if (group !== undefined) {
    const c = resolveTier(ctx, group.items, spec.amount, askedId);
    const through = {
      rule: 'group' as const,
      asked: askedId,
      inStock: group.inStock,
      itemId: (c.used[0] as Item).id,
    };
    return stock(c, { through });
  }

  const whole = partItems(ctx, want);
  if (whole !== undefined) {
    // The whole's amount says nothing exact about the part's: with an amount the line is
    // there with the amount unknown, unless an always-there item covers it.
    const always = whole.items.find((i) => i.always === true);
    const used = always ?? (whole.items[0] as Item);
    const status =
      spec.amount === undefined || always !== undefined ? 'have' : 'have-amount-unknown';
    const through = {
      rule: 'part' as const,
      asked: askedId,
      inStock: whole.inStock,
      itemId: used.id,
    };
    return stock({ status, used: [used] }, { through });
  }

  const comp = spec.ref.kind === 'component' ? ctx.components.get(askedId) : undefined;
  if (comp !== undefined) {
    const made = makeComponent(ctx, comp, spec.amount, stack);
    if (!made.ok) return made;
    const complete = !made.reports.some((r) => !r.optional && lacks(r.status));
    return {
      ...head,
      status: !complete
        ? 'missing'
        : flatSubstituted(made.reports)
          ? 'have-by-substitution'
          : 'have',
      ...(complete ? { source: 'made' as const } : {}),
      items: [],
      parts: made.reports,
      scaled: made.scaled,
    };
  }

  const sibling = siblingItems(ctx, want);
  if (sibling !== undefined) {
    const c = resolveTier(ctx, sibling.items, spec.amount, askedId);
    const substitution = {
      asked: askedId,
      substitute: sibling.substitute,
      itemId: (c.used[0] as Item).id,
    };
    return stock(c, {
      status: c.status === 'have' ? 'have-by-substitution' : c.status,
      substitution,
    });
  }
  const declared = declaredItems(ctx, want);
  if (declared !== undefined) {
    const { effect } = declared;
    const need =
      spec.amount !== undefined && effect.factor !== undefined
        ? { value: spec.amount.value * effect.factor, unit: spec.amount.unit }
        : spec.amount;
    const c = resolveTier(ctx, declared.items, need, askedId);
    const substitution = {
      asked: askedId,
      substitute: declared.substitute,
      itemId: (c.used[0] as Item).id,
      effect: effect.id,
      ...(effect.factor !== undefined ? { factor: effect.factor } : {}),
    };
    return stock(c, {
      status: c.status === 'have' ? 'have-by-substitution' : c.status,
      substitution,
      ...(need !== undefined ? { need } : {}),
    });
  }
  return { ...head, status: 'missing', items: [] };
}

/** Lines in order; fails only on a cycle of components. */
export function evaluateLines(
  ctx: Context,
  specs: readonly LineSpec[],
  stack: readonly string[],
): { ok: true; reports: MakeableLineReport[] } | Fail {
  const reports: MakeableLineReport[] = [];
  for (const spec of specs) {
    const report = evaluateLine(ctx, spec, stack);
    if ('ok' in report) return report;
    reports.push(report);
  }
  return { ok: true, reports };
}
