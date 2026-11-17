// Substitution classes proposed by rule: ingredients connected by the
// source's substitute pairs form one class, named after its smallest id.
import type { SourceCocktail } from './source';

export function substitutionClasses(cocktails: readonly SourceCocktail[]): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    return root;
  };
  const add = (x: string) => {
    if (!parent.has(x)) parent.set(x, x);
  };
  for (const c of cocktails) {
    for (const line of c.ingredients) {
      for (const s of line.substitutes) {
        add(line._id);
        add(s._id);
        parent.set(find(line._id), find(s._id));
      }
    }
  }
  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  const out = new Map<string, string>();
  for (const members of groups.values()) {
    const name = `sc-${members.reduce((a, b) => (a < b ? a : b))}`;
    for (const id of members) out.set(id, name);
  }
  return out;
}
