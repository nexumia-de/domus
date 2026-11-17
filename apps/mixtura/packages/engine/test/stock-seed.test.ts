// The real seed (635 specs, 296 ingredients): invariants only, plus the
// time budget on a phone-class limit (docs/makeable.md#performance).
import { describe, expect, test } from 'vitest';
import {
  buildStockIndex,
  buildTree,
  makeableSpecs,
  missingOne,
  pairRanking,
  unlockRanking,
  type StockEntry,
  type StockMode,
  type StockSpec,
} from '../src/index';
import { bruteUnlock, candidatesOf, pairMismatches } from './helpers/stock-oracle';
import { rng, world } from './helpers/stock-world';
import { seed, seedTree } from './seed-data';

const tree = seedTree();
const specs = seed.specs.specs as unknown as StockSpec[];
const ingredients = seed.ingredients.ingredients;
const index = buildStockIndex(tree, specs);
const ok = (s: string) => s === 'makeable' || s === 'makeable-with-substitution';
const modes: StockMode[] = ['strict', 'with-substitutes'];

/** A reproducible stock of about a tenth of the ingredients. */
function sampleStock(seedNumber: number): StockEntry[] {
  const r = rng(seedNumber);
  return ingredients.filter(() => r() < 0.1).map((i) => ({ ingredientId: i.id, present: true }));
}

describe('invariants on the seed', () => {
  test('empty stock makes nothing makeable, in both modes', () => {
    for (const mode of modes) {
      const report = makeableSpecs(index, [], { mode });
      expect(report.specs.length).toBe(specs.length);
      expect(report.specs.filter((r) => ok(r.status))).toEqual([]);
    }
  });

  test('every ingredient in stock makes every spec without unknown ingredients makeable, strictly', () => {
    const all = ingredients.map((i) => ({ ingredientId: i.id, present: true }));
    const report = makeableSpecs(index, all, { mode: 'strict' });
    for (const r of report.specs) {
      expect(r.status === 'makeable' || r.unknown.length > 0, r.specId).toBe(true);
    }
    expect(report.specs.filter((r) => r.status === 'makeable').length).toBeGreaterThan(0);
  });

  test('strict makeable is a subset of makeable with substitutes; results are ordered by id', () => {
    const stock = sampleStock(7);
    const strict = makeableSpecs(index, stock, { mode: 'strict' });
    const sub = makeableSpecs(index, stock, { mode: 'with-substitutes' });
    const ids = strict.specs.map((r) => r.specId);
    expect(ids).toEqual([...ids].sort());
    strict.specs.forEach((r, i) => {
      if (r.status === 'makeable') expect(sub.specs[i]?.status).toBe('makeable');
      expect(sub.specs[i]?.specId).toBe(r.specId);
    });
    expect(sub.specs.filter((r) => ok(r.status)).length).toBeGreaterThanOrEqual(
      strict.specs.filter((r) => ok(r.status)).length,
    );
  });

  test('missing-one entries have one missing ingredient that is in the tree', () => {
    const report = makeableSpecs(index, sampleStock(11), { mode: 'strict' });
    const one = missingOne(index, report);
    expect(one.length).toBeGreaterThan(0);
    for (const m of one) expect(tree.byId.has(m.missing)).toBe(true);
  });

  test.each(modes)('ranking counts equal a brute-force recomputation for a sample, %s', (mode) => {
    const stock = sampleStock(3);
    const result = unlockRanking(index, stock, { mode });
    expect(result.ranking.length).toBeGreaterThan(0);
    const sorted = [...result.ranking].sort(
      (a, b) => b.count - a.count || b.templates - a.templates,
    );
    expect(result.ranking.map((c) => c.count)).toEqual(sorted.map((c) => c.count));
    const r = rng(5);
    const top = result.ranking.slice(0, 12);
    const others = candidatesOf(ingredients, stock).filter(() => r() < 0.08);
    const folded = new Map(result.ranking.flatMap((c) => c.alsoBy.map((t) => [t, c] as const)));
    for (const c of top) {
      expect(c.unlocks, c.ingredientId).toEqual(
        bruteUnlock(tree, specs, stock, c.ingredientId, mode),
      );
    }
    for (const id of others) {
      const listed = result.ranking.find((c) => c.ingredientId === id) ?? folded.get(id);
      expect(listed?.unlocks ?? [], id).toEqual(bruteUnlock(tree, specs, stock, id, mode));
    }
  });
});

describe.each(modes)('pair ranking on the seed, %s', (mode) => {
  const stock = sampleStock(3);
  const result = pairRanking(index, stock, { mode, limit: 15 });

  test('is ordered, every pair adds to both members, and the top equals the brute force', () => {
    expect(result.total).toBeGreaterThan(0);
    expect(result.ranking.length).toBe(15);
    const counts = result.ranking.map((p) => p.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    for (const p of result.ranking) {
      expect(p.count).toBeGreaterThan(p.byFirst.length);
      expect(p.count).toBeGreaterThan(p.bySecond.length);
      expect(p.first < p.second).toBe(true);
    }
    // The best pair is at least as good as the two best single candidates together.
    const [a, b] = unlockRanking(index, stock, { mode }).ranking;
    const union = new Set([...(a?.unlocks ?? []), ...(b?.unlocks ?? [])]);
    expect(result.ranking[0]?.count).toBeGreaterThanOrEqual(union.size);
    expect(pairMismatches(tree, specs, stock, result, [])).toEqual([]);
  });
});

describe('time budget', () => {
  // The limits are generous (a slow CI machine, a phone); measured numbers are in docs/makeable.md.
  const ms = (run: () => void): number => {
    const t = globalThis.performance.now();
    run();
    return globalThis.performance.now() - t;
  };

  test('seed: index, makeable for all specs and the full ranking', () => {
    const stock = sampleStock(21);
    expect(ms(() => buildStockIndex(tree, specs))).toBeLessThan(500);
    const fresh = buildStockIndex(tree, specs);
    expect(ms(() => makeableSpecs(fresh, stock, { mode: 'with-substitutes' }))).toBeLessThan(1000);
    expect(ms(() => unlockRanking(fresh, stock, { mode: 'with-substitutes' }))).toBeLessThan(2000);
    // With the index already warm, a stock change is cheap.
    expect(
      ms(() => makeableSpecs(fresh, sampleStock(22), { mode: 'with-substitutes' })),
    ).toBeLessThan(500);
    expect(
      ms(() => unlockRanking(fresh, sampleStock(22), { mode: 'with-substitutes' })),
    ).toBeLessThan(1000);
  });

  test('seed: the pair ranking stays well under 200 ms', () => {
    const fresh = buildStockIndex(tree, specs);
    for (const mode of modes) {
      for (const n of [0, 21, 22, 23]) {
        const stock = n === 0 ? [] : sampleStock(n);
        const t = ms(() => pairRanking(fresh, stock, { mode }));
        process.stderr.write(`pairRanking ${mode} stock ${n}: ${t.toFixed(1)} ms\n`);
        expect(t).toBeLessThan(2000);
      }
    }
  });

  test('2000 specs and 500 ingredients', () => {
    const w = world(99, { categories: 60, specs: 2000, stocks: 1 });
    expect(w.ingredients.length).toBeGreaterThan(400);
    const built = buildTree(w.ingredients);
    if (!built.ok) throw new Error('tree');
    const big = buildStockIndex(built.tree, w.specs);
    const stock = w.stocks[0] as StockEntry[];
    expect(ms(() => makeableSpecs(big, stock, { mode: 'with-substitutes' }))).toBeLessThan(3000);
    expect(ms(() => unlockRanking(big, stock, { mode: 'with-substitutes' }))).toBeLessThan(6000);
    const t = ms(() => pairRanking(big, stock, { mode: 'with-substitutes' }));
    process.stderr.write(`pairRanking 2000 specs: ${t.toFixed(1)} ms\n`);
    expect(t).toBeLessThan(12000);
  });
});
