// The family of a drink as data: the chain of parents above it, the drink,
// its riffs, and the other riffs of its parent. Every entry that has a parent
// says in one line what differs from the parent version it was made from.
// The tree is the engine's (`buildFamily`); this file words it.

import type { DisplaySystem } from '@mixtura/engine';
import type { BrowseModel } from '../browse/model';
import type { SpecData } from '../browse/types';
import { riffSummary, type RiffSummary } from '../versions/diff-vm';
import { versionStrings as vs } from '../versions/strings';
import { strings } from '../../strings';

export interface FamilyEntry {
  lineageId: string;
  name: string;
  href: string;
  /** Template and ABV, as in the drinks list. */
  sub: string;
  /** Indentation steps, 0 for the oldest ancestor shown. */
  depth: number;
  role: 'ancestor' | 'self' | 'child' | 'sibling';
  /** What differs from the parent, for an entry that has a parent in the data. */
  change?: RiffSummary;
  /** The note of the riff's first version ("Riff on Daiquiri v1"). */
  note?: string;
  /** The riff's parent is not in the data. */
  parentGone?: boolean;
}

export interface FamilyVM {
  lineageId: string;
  name: string;
  entries: FamilyEntry[];
  /** No parent and no riffs. */
  empty: boolean;
  /** No riffs, but a parent. */
  noRiffs: boolean;
  /** A loop in the chain, named by drink names. */
  cycle?: string;
}

function entryOf(
  model: BrowseModel,
  lineageId: string,
  role: FamilyEntry['role'],
  depth: number,
  system: DisplaySystem,
): FamilyEntry | undefined {
  const drink = model.byLineage.get(lineageId);
  if (!drink) return undefined;
  const head = drink.spec;
  const template = head.templateId ? model.templateById.get(head.templateId) : undefined;
  const abv = model.abvOf(head);
  const first = model.versionsOf(lineageId)[0];
  const parent: SpecData | undefined =
    first?.parentId !== undefined ? model.specById.get(first.parentId) : undefined;
  const entry: FamilyEntry = {
    lineageId,
    name: head.name,
    href: `#/drinks/${encodeURIComponent(lineageId)}`,
    sub: [
      template?.name ?? strings.browse.noTemplate,
      abv === undefined ? strings.browse.abvNone : strings.browse.abvRow(abv),
    ].join(' · '),
    depth,
    role,
  };
  if (parent && first) entry.change = riffSummary(model, parent, head, system);
  else if (first?.parentId !== undefined) entry.parentGone = true;
  if (first?.note) entry.note = first.note;
  return entry;
}

export function familyVM(
  model: BrowseModel,
  lineageId: string,
  system: DisplaySystem,
): FamilyVM | undefined {
  const drink = model.byLineage.get(lineageId);
  if (!drink) return undefined;
  const family = model.family(lineageId);
  const entries: FamilyEntry[] = [];
  const add = (
    id: string,
    role: FamilyEntry['role'],
    depth: number,
    list: FamilyEntry[] = entries,
  ): void => {
    const entry = entryOf(model, id, role, depth, system);
    if (entry) list.push(entry);
  };
  family.ancestors.forEach((id, i) => add(id, 'ancestor', i));
  const depth = family.ancestors.length;
  add(lineageId, 'self', depth);
  for (const id of family.children) add(id, 'child', depth + 1);
  for (const id of family.siblings) add(id, 'sibling', 0);
  const vm: FamilyVM = {
    lineageId,
    name: drink.spec.name,
    entries,
    empty: family.ancestors.length === 0 && family.children.length === 0 && !family.missingParent,
    noRiffs: family.children.length === 0 && family.ancestors.length > 0,
  };
  if (family.cycle) {
    vm.cycle = vs.cycle(
      family.cycle.map((id) => model.byLineage.get(id)?.spec.name ?? id).join(', '),
    );
  }
  return vm;
}
