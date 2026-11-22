// Which dishes the stock allows now, for "Surprise me with a dish": asked of the finder as it is,
// with no line allowed to lack (`find` for the notebook's dishes, `classicsWithin` for the shipped
// ones, which skips the finder's look for the nearest). Nothing is judged here; this only turns
// the finder's answers into entry keys.
import { entryKey } from '../browse/entry';
import { classicsWithin } from '../cook/classic-finder';
import { shippedNow } from '../cook/entries';
import { find } from '../cook/finder';
import { cookToday, notebookSource } from '../cook/source';

/** The keys of the entries whose every required line the stock covers today. */
export const readyNowKeys = (): Set<string> => {
  const source = notebookSource();
  const today = cookToday();
  const keys = new Set<string>();
  const own = find(source, today, { lacking: 0 });
  if (own.ok)
    for (const c of own.within)
      if (c.kind === 'dish' && c.complete) keys.add(entryKey('own', c.id));
  const shipped = shippedNow();
  const classics = classicsWithin(
    shipped.classics,
    source,
    shipped.catalogue,
    today,
    0,
    shipped.lang,
  );
  if (classics.ok)
    for (const c of classics.candidates) if (c.complete) keys.add(entryKey('shipped', c.id));
  return keys;
};
