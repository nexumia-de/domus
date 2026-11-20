// Which spaces count for stock and which one new entries go to. Pure: the
// spaces of the device and the device setting in, a selection out
// (docs/screens-stock-settings.md#spaces). Spaces are made, named, shared and
// removed in the Household app; here they are only chosen.
// Invariants: at least one space counts, the entry space always counts, and
// the spaces are kept sorted by name, so "the first space" and the order of
// the ticked ones are the same on every device.

import type { Space, SpaceSettings } from '../store';

/** The spaces that exist, the ones that count and the space new entries go to. */
export interface Selection {
  spaces: Space[];
  ticked: string[];
  entry: string;
}

/** Why a change was refused; `strings.spaces` has the words for each. */
export type Refusal = { reason: 'last-counting' } | { reason: 'entry-counting'; name: string };

export type Outcome = { ok: true; selection: Selection } | ({ ok: false } & Refusal);

const byName = (a: Space, b: Space): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Spaces sorted by name; ticked ids in that order, without unknown ones; the entry space counts. */
export function tidy(selection: Selection): Selection {
  const spaces = [...selection.spaces].sort(byName);
  const known = new Set(spaces.map((p) => p.id));
  const first = spaces[0]?.id ?? '';
  const entry = known.has(selection.entry) ? selection.entry : first;
  const wanted = new Set(selection.ticked.filter((id) => known.has(id)));
  if (entry !== '') wanted.add(entry);
  const ticked = spaces.filter((p) => wanted.has(p.id)).map((p) => p.id);
  return { spaces, ticked, entry };
}

/**
 * The device setting made consistent with the spaces that exist now.
 * - Ids of spaces that are gone drop out.
 * - A space this device has not seen before counts at once: joining a household in the
 *   Household app shows its stock without a further step.
 * - When such a new space is a shared one and the entry space is on this device only and
 *   holds no stock, the new space becomes the entry space and the empty one stops counting:
 *   the space made at the first start gives way to the household's.
 * - Without an entry space, the first shared space is taken, else the first space.
 * @param spaces The spaces on the device.
 * @param setting The stored setting.
 * @param hasStock Whether a space holds any live stock record.
 * @returns The selection and the setting to store (`known` lists every space).
 */
export function resolveSelection(
  spaces: readonly Space[],
  setting: SpaceSettings,
  hasStock: (spaceId: string) => boolean,
): { selection: Selection; setting: SpaceSettings } {
  const sorted = [...spaces].sort(byName);
  const here = new Set(sorted.map((s) => s.id));
  const seen = new Set(setting.known);
  const fresh = sorted.filter((s) => !seen.has(s.id));
  let ticked = [...setting.ticked.filter((id) => here.has(id)), ...fresh.map((s) => s.id)];
  let entry = here.has(setting.entry) ? setting.entry : '';
  const current = sorted.find((s) => s.id === entry);
  const arrived = fresh.find((s) => !s.deviceOnly);
  if (arrived && current?.deviceOnly === true && !hasStock(current.id)) {
    ticked = ticked.filter((id) => id !== current.id);
    entry = arrived.id;
  }
  if (entry === '') {
    const counting = sorted.filter((s) => ticked.includes(s.id));
    entry = (counting.find((s) => !s.deviceOnly) ?? counting[0] ?? sorted[0])?.id ?? '';
  }
  const selection = tidy({ spaces: sorted, ticked, entry });
  return {
    selection,
    setting: { ticked: selection.ticked, entry: selection.entry, known: sorted.map((s) => s.id) },
  };
}

/** Whether two settings say the same. */
export const sameSetting = (a: SpaceSettings, b: SpaceSettings): boolean =>
  a.entry === b.entry &&
  a.ticked.join(' ') === b.ticked.join(' ') &&
  [...a.known].sort().join(' ') === [...b.known].sort().join(' ');

const nameOf = (selection: Selection, id: string): string =>
  selection.spaces.find((p) => p.id === id)?.name ?? '';

/** Ticking a space makes it count; unticking the last one, or the entry space, is refused. */
export function toggleTicked(selection: Selection, id: string): Outcome {
  if (!selection.ticked.includes(id)) {
    return { ok: true, selection: tidy({ ...selection, ticked: [...selection.ticked, id] }) };
  }
  if (selection.ticked.length <= 1) return { ok: false, reason: 'last-counting' };
  if (selection.entry === id) {
    return { ok: false, reason: 'entry-counting', name: nameOf(selection, id) };
  }
  return {
    ok: true,
    selection: tidy({ ...selection, ticked: selection.ticked.filter((t) => t !== id) }),
  };
}

/** New entries go to this space; it counts from now on. */
export function setEntry(selection: Selection, id: string): Selection {
  return tidy({ ...selection, entry: id, ticked: [...selection.ticked, id] });
}

/** The names of the spaces that count, in order, for the line above the summary. */
export function countingNames(selection: Selection): string[] {
  const counting = new Set(selection.ticked);
  return selection.spaces.filter((p) => counting.has(p.id)).map((p) => p.name);
}
