// The difference between two versions of one component or dish: a list of changed lines and
// fields. Line matching comes from materia's `diffVersions`; what is compared (lines with
// amounts and refs, yield, method, slots) is the kitchen part. Pure; the date is never read.
import { diffVersions } from '../model';
import type { DiffDomain, VersionLine, VersionSpec } from '../model';
import type {
  DiffComponent,
  DiffDish,
  DiffLine,
  DiffResult,
  FieldChange,
  LineChange,
  LineField,
  VersionChange,
  VersionField,
  Versioned,
} from './types';

/** A line in the shape materia matches; `source` carries the stored line back out. */
interface Matched extends VersionLine {
  source: DiffLine;
}

const key = (line: DiffLine): string => `${line.ref.kind}:${line.ref.id}`;

const matched = (line: DiffLine): Matched => ({
  ingredientId: key(line),
  amount: line.amount?.value ?? 0,
  unit: line.amount?.unit ?? '',
  ...(line.role === undefined ? {} : { role: line.role }),
  ...(line.optional === true ? { optional: true } : {}),
  ...(line.note === undefined || line.note === '' ? {} : { note: line.note }),
  source: line,
});

const amountText = (a: { value: number; unit: string } | undefined): string =>
  a === undefined ? '' : `${a.value} ${a.unit}`;

/** What differs between two matched lines, spelled as the kitchen model names it. */
const fieldsOf = (before: DiffLine, after: DiffLine): LineField[] => {
  const out: LineField[] = [];
  if (key(before) !== key(after)) out.push('ref');
  if (amountText(before.amount) !== amountText(after.amount)) out.push('amount');
  if (before.role !== after.role) out.push('role');
  if (before.state !== after.state) out.push('state');
  if ((before.note ?? '') !== (after.note ?? '')) out.push('note');
  if ((before.optional ?? false) !== (after.optional ?? false)) out.push('optional');
  return out;
};

type FieldReader<S> = readonly [VersionField, (s: S) => string | undefined];

const run = <S extends VersionSpec<Matched>>(
  before: S,
  after: S,
  fields: readonly FieldReader<S>[],
): VersionChange[] => {
  const domain: DiffDomain<Matched, S, VersionField> = { fields, amountKeys: [] };
  const diff = diffVersions(before, after, { roleOf: (l) => l.role }, domain);
  const lines = diff.lines.map((l): LineChange => {
    const b = l.before?.source;
    const a = l.after?.source;
    return {
      type: 'line',
      kind: l.kind,
      ...(b === undefined ? {} : { before: b }),
      ...(a === undefined ? {} : { after: a }),
      fields: b !== undefined && a !== undefined ? fieldsOf(b, a) : [],
    };
  });
  const changed = lines.filter((l) => l.kind !== 'changed' || l.fields.length > 0);
  const fieldChanges = diff.fields.map((f): FieldChange => ({
    type: 'field',
    field: f.field,
    ...(f.before === undefined ? {} : { before: f.before }),
    ...(f.after === undefined ? {} : { after: f.after }),
  }));
  return [...changed, ...fieldChanges];
};

const sameFamily = (a: Versioned, b: Versioned): boolean => a.version.family === b.version.family;

const finish = (changes: VersionChange[]): DiffResult => ({
  ok: true,
  diff: { changes, empty: changes.length === 0 },
});

const opt = (text: string | undefined): string | undefined =>
  text === undefined || text === '' ? undefined : text;

/**
 * What changed from `before` to `after` in one component: lines added, removed or changed,
 * then name, role, template, percent base, yield and method. Both must be versions of one
 * family (`different-family`: comparing different recipes is not offered).
 */
export function diffComponentVersions(before: DiffComponent, after: DiffComponent): DiffResult {
  if (!sameFamily(before, after)) {
    return { ok: false, error: { code: 'different-family', id: after.id } };
  }
  const spec = (c: DiffComponent): VersionSpec<Matched> & { c: DiffComponent } => ({
    lines: c.lines.map(matched),
    c,
  });
  const read = (pick: (c: DiffComponent) => string | undefined) => (s: { c: DiffComponent }) =>
    pick(s.c);
  const fields: FieldReader<ReturnType<typeof spec>>[] = [
    ['name', read((c) => opt(c.name))],
    ['role', read((c) => c.role)],
    ['templateId', read((c) => c.templateId)],
    ['percentBase', read((c) => c.percentBase)],
    ['yield', read((c) => (c.yield === undefined ? undefined : amountText(c.yield.amount)))],
    ['method', read((c) => opt((c.method ?? []).join('\n')))],
  ];
  return finish(run(spec(before), spec(after), fields));
}

/**
 * What changed from `before` to `after` in one dish: slots added, removed or changed, then
 * name, portions, course, cuisine and note. Both must be versions of one family.
 */
export function diffDishVersions(before: DiffDish, after: DiffDish): DiffResult {
  if (!sameFamily(before, after)) {
    return { ok: false, error: { code: 'different-family', id: after.id } };
  }
  const spec = (d: DiffDish): VersionSpec<Matched> & { d: DiffDish } => ({
    lines: d.slots.map((s) =>
      matched({
        ref: s.ref,
        role: s.role,
        ...(s.amount === undefined ? {} : { amount: s.amount }),
        ...(s.optional === true ? { optional: true } : {}),
      }),
    ),
    d,
  });
  const read = (pick: (d: DiffDish) => string | undefined) => (s: { d: DiffDish }) => pick(s.d);
  const fields: FieldReader<ReturnType<typeof spec>>[] = [
    ['name', read((d) => opt(d.name))],
    ['portions', read((d) => (d.portions === undefined ? undefined : String(d.portions)))],
    ['course', read((d) => d.course)],
    ['cuisine', read((d) => d.cuisine)],
    ['note', read((d) => opt(d.note))],
  ];
  return finish(run(spec(before), spec(after), fields));
}
