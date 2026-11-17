// The versions screen as data: the versions of one drink, newest first, each
// with its date, status, note, a short summary of what changed against the
// version before and the three figures as numbers with their position words.

import { summariseRiff } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import { balanceVM } from '../spec/balance-vm';
import { templateOf, compactItems } from '../spec/view-model';
import { strings } from '../../strings';
import { diffOf } from './diff-vm';
import { versionStrings as vs } from './strings';

export interface VersionRow {
  version: number;
  specId: string;
  date: string;
  status: string;
  note?: string;
  summary: string;
  figures: { name: string; value: string; positionShort?: string }[];
  newest: boolean;
  href: string;
}

export interface VersionsVM {
  lineageId: string;
  name: string;
  rows: VersionRow[];
  /** Every change of status with its date, oldest first. */
  statusLog: string[];
}

/** "17 Nov 2026" in the reader's time zone; empty for a missing or unreadable instant. */
export function dateText(instant: string | undefined): string {
  if (!instant) return '';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function versionsVM(model: BrowseModel, lineageId: string): VersionsVM | undefined {
  const versions = model.versionsOf(lineageId);
  const newest = versions.at(-1);
  if (!newest) return undefined;
  const rows = versions.map((spec, i): VersionRow => {
    const before = versions[i - 1];
    const count = before ? summariseRiff(diffOf(model, before, spec)).count : 0;
    const { template } = templateOf(model, spec);
    const figures = compactItems(
      balanceVM(model.balanceOf(spec), spec.method, template, model.ingredientName),
    );
    const { note } = spec;
    return {
      version: spec.version,
      specId: spec.id,
      date: dateText(spec.updatedAt),
      status: strings.spec.status[spec.status],
      ...(note && { note }),
      summary: before ? (count === 0 ? vs.noChangesCap : vs.summary(count)) : vs.summaryNone,
      figures,
      newest: spec === newest,
      href: `#/drinks/${encodeURIComponent(lineageId)}/v/${spec.version}`,
    };
  });
  const entries = newest.statusLog ?? [];
  const log = entries.map((entry) =>
    vs.statusChanged(strings.spec.status[entry.status], dateText(entry.at)),
  );
  return { lineageId, name: newest.name, rows: rows.reverse(), statusLog: log };
}
