// What can replace an ingredient, as the dish screen shows it. The engine picks the substitutes
// (by the ingredient or a group above it); the factor is the source's own number, only put into
// words here, never used to compute an amount. Pure: no DOM.
import { pickText, substituteEffects } from '@culina/engine';
import type { Lang, Substitute } from '@culina/engine';
import { strings } from '../strings';
import type { NameOf } from './dish-view';
import type { TreeEntry } from './tree';

const t = strings.classics;

/** The factors that have a plain word; any other is written as "n times the amount". */
const WORDS: readonly [number, string][] = [
  [0.25, t.factorQuarter],
  [1 / 3, t.factorThird],
  [0.5, t.factorHalf],
  [2 / 3, t.factorTwoThirds],
  [0.75, t.factorThreeQuarters],
  [1, t.factorSame],
  [1.5, t.factorOneAndHalf],
  [2, t.factorTwice],
];

/** The factor in words: "about half the amount". */
export const factorText = (factor: number): string =>
  WORDS.find(([value]) => Math.abs(value - factor) < 1e-9)?.[1] ?? t.factorTimes(String(factor));

export interface SubstituteItem {
  id: string;
  /** The name of the replacement. */
  name: string;
  /** The factor in words, when the source gives one. */
  factor?: string;
  changes: string;
  level: Substitute['level'];
  sources: Substitute['sources'];
}

/** The substitutes of an ingredient in a language; empty when there are none. */
export const substituteItems = (
  ingredient: string,
  tree: readonly TreeEntry[],
  list: readonly Substitute[],
  lang: Lang,
  nameOf: NameOf,
): SubstituteItem[] =>
  substituteEffects(ingredient, tree, list).map((s) => ({
    id: s.id,
    name: nameOf(s.to),
    ...(s.factor === undefined ? {} : { factor: factorText(s.factor) }),
    changes: pickText(s.changes, lang),
    level: s.level,
    sources: s.sources,
  }));
