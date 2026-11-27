// "No mark without its dish": a favourite of an own dish whose family is gone is a remnant of a
// deleted dish and is dropped, from the export, from a replace and from a merge (docs/data-model.md,
// Favourite). A favourite of a shipped dish stays: which dishes a later build ships is not known when
// a file is read. Pure: the records come in; the families are `dishFamilies` of the dishes kept.
import type { ExportRecord } from '@culina/engine';

/** The favourites that are of a shipped dish, or of an own dish whose family is among `families`. */
export const favouritesOfLiveDishes = (
  favourites: readonly ExportRecord[],
  families: ReadonlySet<string>,
): ExportRecord[] =>
  favourites.filter(
    (f) => f.origin === 'shipped' || (typeof f.dish === 'string' && families.has(f.dish)),
  );
