// The summary of a file's content: counts per kind, and a readable label for a record.
import { EXPORT_KINDS, pickText } from '@culina/engine';
import { classicOf, techniques } from '../../classics/content';
import { currentLang } from '../../classics/lang';
import type { ExportKind, ExportRecord, FullRecordSets } from '@culina/engine';
import { formatDate } from '../../shared/locale';
import { getDish } from '../../notebook';
import { el } from '../../shell/el';
import { strings } from '../../strings';

export const recordLabel = (kind: ExportKind, record: ExportRecord): string => {
  if (kind === 'tastings')
    return `${formatDate(String(record.date))} ${String(record.text).slice(0, 40)}`;
  if (kind === 'cooked') {
    // The day and the dish, by the name of its first version where this notebook has it.
    const dish = getDish(String(record.dish));
    const day = formatDate(String(record.date));
    return dish === undefined ? `${day} ${String(record.dish)}` : `${day} ${dish.name}`;
  }
  if (kind === 'favourites') {
    // The dish by its name where this notebook has it or the app ships it, else the id.
    const id = String(record.dish);
    if (record.origin === 'own') return getDish(id)?.name ?? id;
    const classic = classicOf(id);
    return classic === undefined ? id : pickText(classic.name, currentLang());
  }
  if (kind === 'skills') {
    const technique = techniques().find((t) => t.id === record.technique);
    return technique === undefined
      ? String(record.technique)
      : pickText(technique.name, currentLang());
  }
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

/** The number of records, of every kind or of the kinds given. */
export const total = (
  records: FullRecordSets,
  kinds: readonly ExportKind[] = EXPORT_KINDS,
): number => kinds.reduce((n, kind) => n + records[kind].length, 0);

/** The stored lists as a full set (every kind present). */
export const fullSets = (
  records: Partial<Record<ExportKind, readonly ExportRecord[]>>,
): FullRecordSets =>
  Object.fromEntries(EXPORT_KINDS.map((k) => [k, [...(records[k] ?? [])]])) as FullRecordSets;
