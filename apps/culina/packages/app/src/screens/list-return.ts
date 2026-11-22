// The way back from a dish to the list it was opened from (Cook's one list or the Notebook's
// Dishes), with the filter as
// the user left it: a link inside the app never changes the filter. A row of the list notes where
// it was tapped; the dish screen then marks its history entry with that list, so that "Back to
// the list" is the browser's back while the entry before it is that list (also after a reload or
// a trip to the cook screen and back). A dish opened any other way (a bookmark, a link from
// elsewhere) leads to the list the dish belongs to: an own dish to the Notebook's Dishes, a shipped
// one to Cook. A history entry marked by an older version with the start screen (#/start, gone
// since docs/decisions/cook-screen.md) counts as Cook, which took its place.
import { hashFor, type Route } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';

/** Cook's one list, or the Notebook's Dishes (own and shipped, a plain list). */
export type ListScreen = 'cook' | 'dishes';

interface FromList {
  fromList: ListScreen;
}

/** The row tapped last: its list and the dish's hash, until the dish screen claims it. */
let tapped: { list: ListScreen; hash: string } | undefined;

/** Called by a row of the list when it is tapped. */
export const noteOpenedFromList = (list: ListScreen, hash: string): void => {
  tapped = { list, hash };
};

/** The list a history entry is marked with; `start` was the list of an older version. */
const listOf = (state: unknown): ListScreen | undefined => {
  const list: unknown = (state as { fromList?: unknown } | null)?.fromList;
  if (list === 'cook' || list === 'start') return 'cook';
  return list === 'dishes' ? 'dishes' : undefined;
};

/** The list this dish screen's history entry was opened from, if any. */
const openedFrom = (): ListScreen | undefined => {
  try {
    if (tapped !== undefined && window.location.hash === tapped.hash) {
      window.history.replaceState({ fromList: tapped.list } satisfies FromList, '');
      tapped = undefined;
    }
    return listOf(window.history.state);
  } catch {
    return undefined;
  }
};

/**
 * "Back to the list": back in the history to the list it came from, else `fallback` (the list the
 * dish belongs to).
 */
export const backToList = (className: string, fallback: Route): HTMLAnchorElement => {
  const from = openedFrom();
  const link = el('a', `${className} back-to-list`, strings.browse.backToList);
  link.href = hashFor(from ?? fallback);
  if (from !== undefined)
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.history.back();
    });
  return link;
};
