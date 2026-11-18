// A diff as sentences for the history screen: one row per changed line or field. Names come
// from the notebook, so a reference to a component shows its current name.
import type { DiffLine, VersionChange, VersionDiff } from '@culina/engine';
import { refName, roleLabel } from '../components/names';
import type { Notebook } from '../records';
import { strings } from '../strings';

const t = strings.versions;

export interface DiffRow {
  kind: 'added' | 'removed' | 'changed' | 'field';
  text: string;
}

const unitText = (unit: string): string => (unit === 'percent' ? '%' : unit);

const amountText = (line: DiffLine): string =>
  line.amount === undefined ? t.toTaste : `${line.amount.value} ${unitText(line.amount.unit)}`;

const lineText = (nb: Notebook, line: DiffLine, role: string | undefined): string => {
  const prefix = role === undefined ? '' : `${roleLabel(role)}: `;
  return `${prefix}${refName(nb, line.ref)}, ${amountText(line)}`;
};

const flat = (text: string | undefined): string =>
  text === undefined ? t.empty : text.replace(/\n/g, ' / ');

const rowOf = (nb: Notebook, change: VersionChange, withRole: boolean): DiffRow => {
  if (change.type === 'field') {
    return {
      kind: 'field',
      text: `${t.fields[change.field]}: ${flat(change.before)} → ${flat(change.after)}`,
    };
  }
  const role = (line: DiffLine | undefined): string | undefined =>
    withRole ? line?.role : undefined;
  if (change.kind === 'added' && change.after !== undefined) {
    return { kind: 'added', text: `${t.added}: ${lineText(nb, change.after, role(change.after))}` };
  }
  if (change.kind === 'removed' && change.before !== undefined) {
    return {
      kind: 'removed',
      text: `${t.removed}: ${lineText(nb, change.before, role(change.before))}`,
    };
  }
  const { before, after } = change;
  if (before === undefined || after === undefined) return { kind: 'changed', text: t.changed };
  const what = change.fields.map((f) => t.fieldNames[f]).join(', ');
  return {
    kind: 'changed',
    text: `${t.changed}: ${lineText(nb, before, role(before))} → ${lineText(nb, after, role(after))} (${what})`,
  };
};

/** `withRole` for dish slots, whose role is part of what a slot is. */
export const diffRows = (nb: Notebook, diff: VersionDiff, withRole: boolean): DiffRow[] =>
  diff.changes.map((c) => rowOf(nb, c, withRole));
