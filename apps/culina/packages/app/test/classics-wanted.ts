// Lists the lines of the shipped classics that still name a `wanted` ingredient instead of a
// catalogue one. A later package replaces them until the list is empty.
import { wantedLines } from '@culina/engine';
import type { Classic, WantedLine } from '@culina/engine';
import { CLASSICS } from '../src/classics';

export interface WantedEntry extends WantedLine {
  classic: string;
}

/** The wanted lines of the given classics (default: every shipped one), by classic then file order. */
export function listWanted(classics: readonly Classic[] = CLASSICS): WantedEntry[] {
  return classics.flatMap((c) => wantedLines(c).map((w) => ({ classic: c.id, ...w })));
}

/** One line per wanted ingredient, for a log or a terminal: `de/example-dish slots[1] Example starch`. */
export const describeWanted = (entries: readonly WantedEntry[]): string[] =>
  entries.map((e) => `${e.classic} ${e.path} ${e.wanted.en} / ${e.wanted.de}`);
