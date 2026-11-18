// Expected amounts for the component and dish screens, computed by the engine itself: the app's
// demo data and `@culina/engine` are bundled in memory with esbuild and called here, so the
// browser checks compare the screen with the engine's output, not with typed-in numbers.
import { build } from 'esbuild';
import { appDir } from './harness.mjs';
import { shown } from './ratio-fixture.mjs';

const bundle = await build({
  stdin: {
    contents: "export * from '@culina/engine'; export * as demo from './src/demo/index.ts';",
    resolveDir: appDir,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});
const code = Buffer.from(bundle.outputFiles[0].text).toString('base64');
const engine = await import(`data:text/javascript;base64,${code}`);
const { demo } = engine;

export { shown, engine };
export const nb = demo.notebook();
export const components = demo.listComponents();
export const dishes = demo.listDishes();
/** Records in the order the lists show them: by name, ignoring case. */
export const byName = (records) =>
  [...records].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
export const component = (id) => components.find((c) => c.id === id);
export const dish = (id) => dishes.find((d) => d.id === id);

const STATES = { raw: 'raw', cooked: 'cooked', prepared: 'prepared' };
const label = (id, state) => nb.ingredientName(id) + (state ? `, ${STATES[state]}` : '');

/** Raw ingredients as the screen lists them: [name, "123 g"] by ingredient and state, then the total. */
export const rawTable = (raw) => {
  const rows = new Map();
  for (const r of raw) {
    const key = label(r.ingredientId, r.state);
    rows.set(key, (rows.get(key) ?? 0) + r.g);
  }
  const total = [...rows.values()].reduce((a, b) => a + b, 0);
  return [...[...rows].map(([name, g]) => [name, shown(g)]), ['Total', shown(total)]];
};

/** The raw list of a component for one run, or for `outputG`, from the engine. */
export const componentRaw = (id, outputG) => {
  const r = engine.expandComponent(nb.components, id, nb.facts, outputG ? { outputG } : {});
  if (!r.ok) throw new Error(`expandComponent ${id}: ${r.error.code}`);
  return rawTable(r.raw);
};

/** Lines of a component: [name, grams, percent of the base or ''], from the engine. */
export const lineTable = (id) => {
  const c = component(id);
  const lines = engine.componentLineGrams(c, nb.facts);
  const pct = c.percentBase
    ? engine.bakersPercent(
        lines.lines.map((l) => ({ id: String(l.index), g: l.g, role: l.role })),
        { baseRole: c.percentBase },
      ).pct
    : undefined;
  return c.lines.map((line, index) => {
    const m = lines.lines.find((l) => l.index === index);
    return [
      line.ref.kind === 'component'
        ? components.find((x) => x.id === line.ref.id).name
        : nb.ingredientName(line.ref.id),
      m ? shown(m.g) : 'to taste',
      pct && m ? String(Number(pct[String(index)].toFixed(1))) : '',
    ];
  });
};

/** Yield figures as shown: input, output, loss, yield percent. */
export const yieldFigures = (id) => {
  const y = engine.componentYield(component(id), nb.facts);
  if (!y.ok || !y.yield.known) return { input: y.ok ? shown(y.inputG) : undefined, known: false };
  return {
    known: true,
    input: shown(y.inputG),
    output: shown(y.yield.outputG),
    loss: shown(Math.abs(y.yield.lossG)),
    pct: `${Number(y.yield.yieldPct.toFixed(1))} %`,
  };
};

/** Slots of a dish for a number of portions: [role label, name, per portion, total], from the engine. */
export const slotTable = (id, portions) =>
  dish(id).slots.map((s) => {
    const g = engine.toGrams(
      s.amount,
      s.ref.kind === 'ingredient' ? nb.facts[s.ref.id] : undefined,
    ).g;
    const name =
      s.ref.kind === 'component'
        ? components.find((c) => c.id === s.ref.id).name
        : nb.ingredientName(s.ref.id);
    return [name, shown(g), shown(g * portions)];
  });

/** The raw list of a whole dish: every slot expanded by the engine for its total weight. */
export const dishRawTable = (id, portions) => {
  const raw = [];
  const skipped = [];
  for (const s of dish(id).slots) {
    const total = engine.toGrams(s.amount, nb.facts[s.ref.id]).g * portions;
    if (s.ref.kind === 'ingredient') {
      raw.push({ ingredientId: s.ref.id, g: total });
      continue;
    }
    const r = engine.expandComponent(nb.components, s.ref.id, nb.facts, { outputG: total });
    if (r.ok) raw.push(...r.raw);
    else skipped.push([s.ref.id, r.error.code]);
  }
  return { table: rawTable(raw), skipped };
};

/** What portions of a weight say, as the screen words it. */
export const portionsLine = (outputG, portionG) => {
  const p = engine.portionsFromYield(outputG, portionG);
  return `About ${Number(p.portions.toFixed(1))} portions: ${p.wholePortions} whole, ${shown(p.remainderG)} left over.`;
};

/** "buy about X g" for an ingredient line, from the engine; undefined where no yield is recorded. */
export const buyAbout = (ingredientId, state, g) => {
  const r = engine.toPurchased(g, nb.ingredientYields(ingredientId), state);
  return r.ok ? `buy about ${shown(r.g)}` : undefined;
};
