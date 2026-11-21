// The way back from a dish to the list it was opened from (Start or Dishes), with the filter as
// the user left it: a link inside the app never changes the filter. A row of the list notes where
// it was tapped; the dish screen then marks its history entry with that list, so that "Back to
// the list" is the browser's back while the entry before it is that list (also after a reload or
// a trip to the cook screen and back). A dish opened any other way (a bookmark, a link from
// elsewhere) leads to the list of dishes.
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';

export type ListScreen = 'start' | 'dishes';

interface FromList {
  fromList: ListScreen;
}

/** The row tapped last: its list and the dish's hash, until the dish screen claims it. */
let tapped: { list: ListScreen; hash: string } | undefined;

/** Called by a row of the list when it is tapped. */
export const noteOpenedFromList = (list: ListScreen, hash: string): void => {
  tapped = { list, hash };
};

const isFromList = (state: unknown): state is FromList => {
  const list = (state as Partial<FromList> | null)?.fromList;
  return list === 'start' || list === 'dishes';
};

/** The list this dish screen's history entry was opened from, if any. */
const openedFrom = (): ListScreen | undefined => {
  try {
    if (tapped !== undefined && window.location.hash === tapped.hash) {
      window.history.replaceState({ fromList: tapped.list } satisfies FromList, '');
      tapped = undefined;
    }
    const state: unknown = window.history.state;
    return isFromList(state) ? state.fromList : undefined;
  } catch {
    return undefined;
  }
};

/** "Back to the list": back in the history to the list it came from, else the list of dishes. */
export const backToList = (className: string): HTMLAnchorElement => {
  const from = openedFrom();
  const link = el('a', `${className} back-to-list`, strings.browse.backToList);
  link.href = hashFor(from ?? 'dishes');
  if (from !== undefined)
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.history.back();
    });
  return link;
};
