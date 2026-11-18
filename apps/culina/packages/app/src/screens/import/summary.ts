// The summary of a file's content: counts per kind, and a readable label for a record.
import { EXPORT_KINDS } from '@culina/engine';
import type { ExportKind, ExportRecord, FullRecordSets } from '@culina/engine';
import { el } from '../../shell/el';
import { strings } from '../../strings';

export const recordLabel = (kind: ExportKind, record: ExportRecord): string => {
  if (kind === 'tastings') return `${String(record.date)} ${String(record.text).slice(0, 40)}`;
  const name = record.name;
  return typeof name === 'string' && name !== '' ? name : record.id;
};

export const summaryList = (records: FullRecordSets): HTMLElement => {
  const list = el('ul', 'summary-list');
  for (const kind of EXPORT_KINDS) {
    const n = records[kind].length;
    if (n > 0) list.append(el('li', undefined, `${n} ${strings.importing.kinds[kind]}`));
  }
  return list;
};

export const total = (records: FullRecordSets): number =>
  EXPORT_KINDS.reduce((n, kind) => n + records[kind].length, 0);

/** The stored lists as a full set (every kind present). */
export const fullSets = (
  records: Partial<Record<ExportKind, readonly ExportRecord[]>>,
): FullRecordSets =>
  Object.fromEntries(EXPORT_KINDS.map((k) => [k, [...(records[k] ?? [])]])) as FullRecordSets;
