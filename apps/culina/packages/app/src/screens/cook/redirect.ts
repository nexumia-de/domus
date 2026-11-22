// The old address #/cook/use-up, the view "Use up first" before docs/decisions/cook-screen.md: it
// keeps the order "Use up first" of Cook's one list and is replaced by #/cook, without a new history
// entry (the router's `Redirect`, handed to it in main.ts), so that links and bookmarks keep
// working. #/start needs no redirect: it is no route any more and opens the default route, Cook.
import { browserStore, readCookList, writeCookList, type KeyValueStore } from '../../prefs';
import { hashFor, USE_UP, type Route } from '../../router';

/** The redirect over a given store; any address but #/cook/use-up is kept (undefined). */
export const cookRedirectWith =
  (store: () => KeyValueStore | null) =>
  (route: Route, param: string | undefined): string | undefined => {
    if (route !== 'cook' || param !== USE_UP) return undefined;
    const kept = store();
    writeCookList(kept, { ...readCookList(kept), order: 'use-up' });
    return hashFor('cook');
  };

export const cookRedirect = cookRedirectWith(browserStore);
