import type { Deps } from '../logic/actions';
import type { Strings } from '../strings';
import type { Lang } from '../prefs';

/** What every screen gets: the texts, the effects, and ways to move on. */
export interface Ctx {
  t: Strings;
  lang: Lang;
  deps: Deps;
  /** This page's address without the fragment: the base of an invite link. */
  base: () => string;
  /** Goes to a hash: a new history entry, or with `replace` instead of the current one. */
  go: (hash: string, replace?: boolean) => void;
  /** A message the next screen shows once (a space was created, joined, removed). */
  flash: { text: string | undefined };
}
