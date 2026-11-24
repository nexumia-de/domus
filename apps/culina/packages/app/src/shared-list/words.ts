// What the cook reads of a hand-over (the dish page's offer, the message after it and Undo), from
// the counts and the result of `handOver` and `undoHandOver`. Words only, in the language of the
// strings passed in; no rule of the list here. Every sentence says what the list holds afterwards.
import type { HandOverLine, UndoOutcome } from './hand-over';
import type { handOverStrings } from '../strings-handover';

type Words = typeof handOverStrings;

/**
 * The offer under the ingredients, or nothing when nothing lacks (or it cannot be judged).
 * `listed` of the `count` lines are on the list from this page; all of them: no button.
 */
export const offerText = (
  count: number | undefined,
  w: Words,
  listed = 0,
): { text: string; button: boolean } | undefined => {
  if (count === undefined || count <= 0) return undefined;
  if (listed >= count) return { text: w.offerDone(count), button: false };
  return { text: listed > 0 ? w.offerSome(count, listed) : w.offer(count), button: true };
};

/** The message after a hand-over: the sentence for the status line and the amounts that differ. */
export interface HandOverSaid {
  text: string;
  /** One line per `already` entry whose amount on the list is not the one asked now. */
  differences: string[];
}

export const handOverSaid = (lines: readonly HandOverLine[], w: Words): HandOverSaid => {
  const put = lines.filter((l) => l.outcome === 'added' || l.outcome === 'joined').length;
  const joined = lines.filter((l) => l.outcome === 'joined').length;
  const already = lines.filter((l) => l.outcome === 'already');
  const differences = already.flatMap((l) =>
    l.asked !== undefined && l.asked !== l.listed ? [w.difference(l.name, l.listed, l.asked)] : [],
  );
  const text = w.summary(put, joined, already.length, already[0]?.name);
  return {
    text: differences.length === 0 ? text : `${text} ${w.differ(differences.length)}`,
    differences,
  };
};

/**
 * What Undo says, by the entries it wrote (`names`: entry id to the line's name; an `already`
 * line is not among them, as Undo never touches it): taken off the list, back as before this
 * dish, left because ticked or changed since, no longer on the list.
 */
export const undoSaid = (
  names: ReadonlyMap<string, string>,
  done: UndoOutcome,
  w: Words,
): string => {
  const of = (keys: readonly string[]): string =>
    [...new Set(keys.map((key) => names.get(key) ?? key))].join('; ');
  const restored = new Set(done.restored);
  const gone = new Set(done.gone);
  return w.undone(
    of(done.undone.filter((k) => !restored.has(k))),
    of(done.restored),
    of(done.kept.filter((k) => !gone.has(k))),
    of(done.gone),
  );
};

/** The names of the entries a hand-over wrote: added or joined lines, never `already` ones. */
export const writtenNames = (lines: readonly HandOverLine[]): Map<string, string> =>
  new Map(
    lines.flatMap((l) =>
      l.id !== undefined && (l.outcome === 'added' || l.outcome === 'joined')
        ? [[l.id, l.name] as const]
        : [],
    ),
  );
