// What the add field offers while a name is typed: the household's earlier
// entries (docs/engine-rules.md#what-the-add-field-offers).
import { compareText, sortKey } from '@nexumia-de/list';

export interface SuggestEntry {
  id: string;
  name: string;
  ingredientId?: string;
  categoryId: string;
  addedAt: string;
  bought?: { at: string };
}

export interface Suggestion {
  /** The name as it was last written. */
  name: string;
  ingredientId?: string;
  categoryId: string;
  /** It is on the list and not bought: adding it raises that entry. */
  open: boolean;
}

/**
 * Earlier entries whose name matches what was typed, each thing once (the latest entry
 * speaks for it): names that start with the text first, then names with a word that starts
 * with it, then names that contain it; inside each group by name. Nothing for an empty text.
 */
export function suggest(query: string, earlier: readonly SuggestEntry[], limit = 8): Suggestion[] {
  const wanted = sortKey(query);
  if (wanted === '') return [];
  const things = new Map<string, { latest: SuggestEntry; open: boolean }>();
  for (const entry of earlier) {
    const thing =
      entry.ingredientId === undefined ? `n\0${sortKey(entry.name)}` : `i\0${entry.ingredientId}`;
    const known = things.get(thing);
    const open = entry.bought === undefined;
    if (known === undefined) things.set(thing, { latest: entry, open });
    else {
      const later =
        entry.addedAt > known.latest.addedAt ||
        (entry.addedAt === known.latest.addedAt && entry.id > known.latest.id);
      things.set(thing, { latest: later ? entry : known.latest, open: known.open || open });
    }
  }
  const hits: { rank: number; key: string; suggestion: Suggestion }[] = [];
  for (const { latest, open } of things.values()) {
    const key = sortKey(latest.name);
    const rank = key.startsWith(wanted)
      ? 0
      : key.split(' ').some((word) => word.startsWith(wanted))
        ? 1
        : key.includes(wanted)
          ? 2
          : -1;
    if (rank < 0) continue;
    hits.push({
      rank,
      key,
      suggestion: {
        name: latest.name,
        ...(latest.ingredientId === undefined ? {} : { ingredientId: latest.ingredientId }),
        categoryId: latest.categoryId,
        open,
      },
    });
  }
  return hits
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        compareText(a.key, b.key) ||
        compareText(a.suggestion.name, b.suggestion.name),
    )
    .slice(0, Math.max(0, limit))
    .map((hit) => hit.suggestion);
}
