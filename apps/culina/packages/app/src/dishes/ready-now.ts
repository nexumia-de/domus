// Which dishes the stock allows now, for "Surprise me with a dish": asked of the finder as it is
// (`find` for the notebook's dishes, `findClassics` for the shipped ones), with no line allowed
// to lack. Nothing is judged here; this only turns the finder's answers into entry keys.
import { entryKey } from '../browse/entry';
import { findClassics } from '../cook/classic-finder';
import { find } from '../cook/finder';
import { cookToday, notebookSource } from '../cook/source';
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { catalogueEntries } from '../classics/names';

/** The keys of the entries whose every required line the stock covers today. */
export const readyNowKeys = (): Set<string> => {
  const source = notebookSource();
  const today = cookToday();
  const keys = new Set<string>();
  const own = find(source, today, { lacking: 0 });
  if (own.ok)
    for (const c of own.within)
      if (c.kind === 'dish' && c.complete) keys.add(entryKey('own', c.id));
  const shipped = findClassics(
    classics(),
    source,
    catalogueEntries(),
    today,
    { lacking: 0 },
    currentLang(),
  );
  if (shipped.ok)
    for (const c of shipped.shown) if (c.complete) keys.add(entryKey('shipped', c.id));
  return keys;
};
