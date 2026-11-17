import type {
  DiffLine,
  DiffOptions,
  DiffSpec,
  FieldDiff,
  LineDiff,
  LineField,
  SpecField,
} from './types';

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Which parts of a matched pair of lines differ. */
function fieldsOf(before: DiffLine, after: DiffLine): LineField[] {
  const out: LineField[] = [];
  if (before.ingredientId !== after.ingredientId) out.push('ingredient');
  if (
    before.amount !== after.amount ||
    before.amountMax !== after.amountMax ||
    before.unit !== after.unit ||
    before.topMl !== after.topMl
  )
    out.push('amount');
  if (before.role !== after.role) out.push('role');
  if ((before.optional ?? false) !== (after.optional ?? false)) out.push('optional');
  if ((before.note ?? '') !== (after.note ?? '')) out.push('note');
  if (!same(before.substitutes ?? [], after.substitutes ?? [])) out.push('substitutes');
  return out;
}

/** The first unmatched older line that `accept` takes, marked as used. */
function take(
  before: readonly DiffLine[],
  used: Set<number>,
  accept: (line: DiffLine) => boolean,
): number {
  const at = before.findIndex((line, i) => !used.has(i) && accept(line));
  if (at >= 0) used.add(at);
  return at;
}

const FIELDS: [SpecField, (s: DiffSpec) => string | undefined][] = [
  ['name', (s) => s.name],
  ['template', (s) => s.templateId],
  ['method', (s) => s.method],
  ['glass', (s) => s.glass],
  ['garnish', (s) => s.garnish?.trim()],
  ['notes', (s) => s.notes?.trim()],
];

/**
 * Compares two versions of a drink: lines added, removed and changed (another
 * ingredient, amount, role, optional flag, note or substitutes), then name,
 * template, method, glass, garnish and notes. Lines are matched, not
 * compared by position: first identical lines, then lines of the same
 * ingredient, then lines in the same role, so a different order is no
 * difference and a replaced ingredient reads as one changed line.
 *
 * @param before The older spec.
 * @param after The newer spec.
 * @param options `roleOf` gives the role of a line (explicit or the ingredient's).
 * @returns The differences; `empty` is true when there are none.
 */
export function diffSpecs(
  before: DiffSpec,
  after: DiffSpec,
  options: DiffOptions = {},
): { lines: LineDiff[]; fields: FieldDiff[]; empty: boolean } {
  const roleOf = (line: DiffLine): string | undefined => options.roleOf?.(line) ?? line.role;
  const used = new Set<number>();
  const pairs = new Map<number, number>();
  const passes: ((a: DiffLine) => (b: DiffLine) => boolean)[] = [
    (a) => (b) => same(a, b),
    (a) => (b) => a.ingredientId === b.ingredientId,
    (a) => (b) => {
      const role = roleOf(a);
      return role !== undefined && role === roleOf(b);
    },
  ];
  for (const pass of passes) {
    after.lines.forEach((line, i) => {
      if (pairs.has(i)) return;
      const at = take(before.lines, used, pass(line));
      if (at >= 0) pairs.set(i, at);
    });
  }
  const lines: LineDiff[] = [];
  after.lines.forEach((line, i) => {
    const at = pairs.get(i);
    if (at === undefined) {
      lines.push({ kind: 'added', after: line, fields: [] });
      return;
    }
    const old = before.lines[at] as DiffLine;
    const fields = fieldsOf(old, line);
    if (fields.length > 0) lines.push({ kind: 'changed', before: old, after: line, fields });
  });
  before.lines.forEach((line, i) => {
    if (!used.has(i)) lines.push({ kind: 'removed', before: line, fields: [] });
  });
  const fields: FieldDiff[] = [];
  for (const [field, read] of FIELDS) {
    const a = read(before) || undefined;
    const b = read(after) || undefined;
    if (a !== b) {
      fields.push({
        field,
        ...(a !== undefined && { before: a }),
        ...(b !== undefined && { after: b }),
      });
    }
  }
  return { lines, fields, empty: lines.length === 0 && fields.length === 0 };
}
