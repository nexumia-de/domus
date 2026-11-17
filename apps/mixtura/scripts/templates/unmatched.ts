// Measures which seed specs fit no template and groups them (docs/templates.md,
// "Seed measurement"). Read-only: prints counts, never writes the seed.
// Group key: the sorted roles of the non-optional lines, e.g. "base+modifier+sour".
import { readFileSync } from 'node:fs';
import {
  buildTree,
  matchSpec,
  resolveProperty,
  ROOT_TEMPLATES,
  type Ingredient,
  type MatchLine,
} from '../../packages/engine/src/index';

interface Line {
  ingredientId: string;
  amount: number;
  amountMax?: number;
  unit: string;
  optional?: boolean;
}
interface Spec {
  id: string;
  name: string;
  lines: Line[];
  method?: string;
  tags?: string[];
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export function main(args: string[], root: string): void {
  const data = `${root}packages/engine/data/seed/`;
  const built = buildTree(
    readJson<{ ingredients: Ingredient[] }>(`${data}ingredients.json`).ingredients,
  );
  if (!built.ok) throw new Error(built.errors.map((e) => e.message).join('; '));
  const tree = built.tree;
  const specs = readJson<{ specs: Spec[] }>(`${data}specs.json`).specs;

  const matched = new Map<string, number>();
  const reasons = new Map<string, number>();
  const reasonNames = new Map<string, string[]>();
  const groups = new Map<string, { names: string[]; near: Map<string, number> }>();
  for (const s of specs) {
    const lines: MatchLine[] = s.lines
      .filter((l) => !l.optional)
      .map((l) => ({
        ingredientId: l.ingredientId,
        amount: l.amount,
        ...(l.amountMax !== undefined ? { amountMax: l.amountMax } : {}),
        unit: l.unit,
      }));
    const r = matchSpec(tree, ROOT_TEMPLATES, { lines });
    if (r.chosen) {
      matched.set(r.chosen.templateId, (matched.get(r.chosen.templateId) ?? 0) + 1);
      continue;
    }
    const best0 = r.candidates[0];
    if (best0) {
      const why = new Set<string>();
      for (const u of best0.assignment.unassigned) {
        const role = resolveProperty(tree, u.ingredientId, 'role').value ?? '?';
        why.add(`${u.reason === 'no-slot-for-role' ? 'no slot for role' : u.reason} ${role}`);
      }
      for (const e of best0.assignment.emptyRequired) why.add(`empty slot ${e}`);
      for (const q of best0.ratios) {
        if (q.status === 'below' || q.status === 'above') why.add(`${q.status} band ${q.slotId}`);
      }
      for (const w of why) {
        const k = `${best0.templateId}: ${w}`;
        reasons.set(k, (reasons.get(k) ?? 0) + 1);
        reasonNames.set(k, [
          ...(reasonNames.get(k) ?? []),
          `${s.name} ${best0.ratios
            .filter((q) => q.parts !== undefined)
            .map((q) => `${q.slotId}=${(q.parts ?? 0).toFixed(2)}`)
            .join(',')}`,
        ]);
      }
    }
    const roles = lines
      .map((l) => (resolveProperty(tree, l.ingredientId, 'role').value ?? '?') as string)
      .sort();
    const key = [...new Set(roles)].join('+') + (s.method ? ` [${s.method}]` : '');
    const g = groups.get(key) ?? { names: [], near: new Map() };
    g.names.push(s.name);
    const best = r.candidates[0]?.templateId ?? '-';
    g.near.set(best, (g.near.get(best) ?? 0) + 1);
    groups.set(key, g);
  }
  const total = specs.length;
  const fit = [...matched.values()].reduce((a, b) => a + b, 0);
  console.log(`specs ${total}, matched ${fit}, unmatched ${total - fit}`);
  console.log(
    'matched per template:',
    [...matched.entries()]
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(', '),
  );
  const sorted = [...groups.entries()].sort((a, b) => b[1].names.length - a[1].names.length);
  const top = args.includes('--all') ? sorted.length : 25;
  for (const [key, g] of sorted.slice(0, top)) {
    const near = [...g.near.entries()].map(([k, v]) => `${k} ${v}`).join(', ');
    console.log(
      `${String(g.names.length).padStart(4)}  ${key}  (nearest: ${near})  e.g. ${g.names.slice(0, 4).join('; ')}`,
    );
  }
  console.log(`groups ${sorted.length}`);
  console.log('why the nearest template fails (a spec can have several reasons):');
  for (const [k, v] of [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    const eg = args.includes('--examples')
      ? `  e.g. ${(reasonNames.get(k) ?? []).slice(0, 4).join('; ')}`
      : '';
    console.log(`${String(v).padStart(4)}  ${k}${eg}`);
  }
}
