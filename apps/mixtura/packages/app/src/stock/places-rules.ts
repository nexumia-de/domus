// The rules for choosing, adding, renaming and removing places. Pure: a
// selection in, a selection or a refusal out (docs/screens-stock-settings.md#places-131).
// Invariants: at least one place exists and counts, the entry place always
// counts, and the places are kept sorted by name, so "the first place" and the
// order of the ticked ones are the same on every device.

import type { Place } from '../store';

/** The places that exist, the ones that count and the place new entries go to. */
export interface Selection {
  places: Place[];
  ticked: string[];
  entry: string;
}

/** Why a change was refused; `strings.places` has the words for each. */
export type Refusal =
  | { reason: 'last-counting' }
  | { reason: 'entry-counting'; name: string }
  | { reason: 'last-place' }
  | { reason: 'empty-name' }
  | { reason: 'name-taken'; name: string };

export type Outcome = { ok: true; selection: Selection } | ({ ok: false } & Refusal);

const byName = (a: Place, b: Place): number =>
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Places sorted by name; ticked ids in that order, without unknown ones; the entry place counts. */
export function tidy(selection: Selection): Selection {
  const places = [...selection.places].sort(byName);
  const known = new Set(places.map((p) => p.id));
  const first = places[0]?.id ?? '';
  const entry = known.has(selection.entry) ? selection.entry : first;
  const wanted = new Set(selection.ticked.filter((id) => known.has(id)));
  if (entry !== '') wanted.add(entry);
  const ticked = places.filter((p) => wanted.has(p.id)).map((p) => p.id);
  return { places, ticked, entry };
}

const nameOf = (selection: Selection, id: string): string =>
  selection.places.find((p) => p.id === id)?.name ?? '';

/** Ticking a place makes it count; unticking the last one, or the entry place, is refused. */
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

/** New entries go to this place; it counts from now on. */
export function setEntry(selection: Selection, id: string): Selection {
  return tidy({ ...selection, entry: id, ticked: [...selection.ticked, id] });
}

/** The name as the user may keep it, or the refusal. Names differ by letters, not by case. */
export function checkName(
  selection: Selection,
  raw: string,
  own?: string,
): { ok: true; name: string } | ({ ok: false } & Refusal) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name === '') return { ok: false, reason: 'empty-name' };
  const same = (p: Place): boolean => p.id !== own && p.name.toLowerCase() === name.toLowerCase();
  if (selection.places.some(same)) return { ok: false, reason: 'name-taken', name };
  return { ok: true, name };
}

/** The place added; it counts. */
export function addPlace(selection: Selection, place: Place): Selection {
  return tidy({
    ...selection,
    places: [...selection.places, place],
    ticked: [...selection.ticked, place.id],
  });
}

/** The place with a new name and stamp. */
export function renamePlace(selection: Selection, id: string, name: string, at: string): Selection {
  const places = selection.places.map((p) => (p.id === id ? { ...p, name, updatedAt: at } : p));
  return tidy({ ...selection, places });
}

/**
 * Removing a place: refused for the last one. The entry place falls back to the first remaining
 * place that counts, else to the first remaining place; when nothing counts any more the first
 * remaining place counts.
 */
export function removePlace(selection: Selection, id: string): Outcome {
  if (selection.places.length <= 1) return { ok: false, reason: 'last-place' };
  const places = selection.places.filter((p) => p.id !== id);
  const ticked = selection.ticked.filter((t) => t !== id);
  const sorted = tidy({ places, ticked, entry: '' }).places;
  const entry =
    selection.entry !== id
      ? selection.entry
      : (sorted.find((p) => ticked.includes(p.id))?.id ?? sorted[0]?.id ?? '');
  return {
    ok: true,
    selection: tidy({ places, ticked: ticked.length > 0 ? ticked : [entry], entry }),
  };
}

/** The names of the places that count, in order, for the line above the summary. */
export function countingNames(selection: Selection): string[] {
  const counting = new Set(selection.ticked);
  return selection.places.filter((p) => counting.has(p.id)).map((p) => p.name);
}
