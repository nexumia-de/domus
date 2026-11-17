// A change that was started on a screen and lands later (the search field
// hands its text over 200 ms after the last key) must not drag the user back:
// by then the address may be another screen (a new drink, a spec), and
// writing the old screen's address would throw them out of it. The change is
// made against the address as it is now, and only while the user is still on
// the screen that started it.

import type { Route } from '../router';
import type { ScreenContext } from '../screen';

const samePath = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((part, i) => part === b[i]);

/** Runs `change` with the current route if it is still the route's screen; otherwise does nothing. */
export function whileHere(context: ScreenContext, change: (now: Route) => void): boolean {
  const now = context.store.get().route;
  if (!samePath(now.path, context.route.path)) return false;
  change(now);
  return true;
}
