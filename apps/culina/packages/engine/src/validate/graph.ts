// Finds cycles by ids only: no amounts, so it works on any link between
// records (parent links, nested components, version parents). Why not
// `expandComponent`: it needs amounts and yields and stops at the first error.

/**
 * Cycles of the graph given by `next`, found by a depth-first walk over `ids`
 * in order. Each cycle is reported once as the ids from its smallest id around
 * and ending with that id again (length 1: `[a, a]`). Links to ids not in
 * `ids` are ignored. Where cycles overlap, only those the walk meets are
 * reported.
 *
 * @param ids - Every record id once.
 * @param next - The ids a record links to.
 * @returns The cycles, in the order found.
 */
export function findCycles(
  ids: readonly string[],
  next: (id: string) => readonly string[],
): string[][] {
  const known = new Set(ids);
  const done = new Set<string>();
  const keys = new Set<string>();
  const out: string[][] = [];
  const visit = (id: string, stack: string[]): void => {
    stack.push(id);
    for (const to of next(id)) {
      if (!known.has(to)) continue;
      const at = stack.indexOf(to);
      if (at >= 0) {
        const ring = stack.slice(at);
        const first = ring.reduce((a, b) => (a <= b ? a : b));
        const from = ring.indexOf(first);
        const turned = [...ring.slice(from), ...ring.slice(0, from)];
        const key = turned.join('\u0000');
        if (!keys.has(key)) {
          keys.add(key);
          out.push([...turned, first]);
        }
      } else if (!done.has(to)) {
        visit(to, stack);
      }
    }
    stack.pop();
    done.add(id);
  };
  for (const id of ids) if (!done.has(id)) visit(id, []);
  return out;
}
