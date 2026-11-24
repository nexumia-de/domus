// Why an entry is on the list, in words: typed on a day, from a recipe of another app (by that
// app's visible name, not its id), or a staple. The web entry screen and the native entry page say
// it the same way.
import type { Origin } from '@nexumia-de/list';
import type { Strings } from '../strings';

/** The visible names of the apps that put recipes on the list; an unknown id is shown as it is. */
const APPS: Readonly<Record<string, string>> = {
  culina: "Cook's Workbench",
  mixtura: 'Drink Builder',
};

/** The visible name of the app an origin names. */
export const appName = (id: string): string => APPS[id] ?? id;

/** One origin of an entry as the entry screen says it; `addedAt` is the entry's. */
export const originText = (origin: Origin, addedAt: string, t: Pick<Strings, 'entry'>): string =>
  origin.kind === 'typed'
    ? t.entry.typed(addedAt.slice(0, 10))
    : origin.kind === 'recipe'
      ? t.entry.recipe(appName(origin.app), origin.title)
      : t.entry.staple;
