// Proposes the parts of a step from one sentence of a recipe: what is done, the lines it uses, a
// time and a temperature. No language model and no scoring: a list of words per technique and plain
// action (data/step-words.json), and rules that each fit in a sentence. A proposal is for the user
// to confirm; where no rule applies, nothing is proposed.
import raw from '../../data/step-words.json';
import type { StepTemperature, StepTime, StepWord } from './types';

/** The words that point at a technique or a plain action, per language. */
export interface StepVocabulary {
  techniques: Readonly<Record<string, { en: readonly string[]; de: readonly string[] }>>;
  actions: Readonly<Record<string, { en: readonly string[]; de: readonly string[] }>>;
}

/** The shipped word lists. The tests check them against the techniques and the plain actions. */
export const STEP_VOCABULARY: StepVocabulary = raw;

/** A line of the recipe a sentence may mention, with the names it goes by. */
export interface ProposalLine {
  key: string;
  names: readonly string[];
}

/** What a sentence suggests. Every part may be absent. */
export interface StepProposal {
  /** The technique or plain action whose word stands first in the sentence. */
  word?: StepWord;
  /** The words of the sentence that gave the proposal, for showing why. */
  matched?: string;
  /** Keys of the lines the sentence names, in the order of the lines. */
  uses: string[];
  time?: StepTime;
  temperature?: StepTemperature;
}

/** The words of a sentence: lower case, split at anything that is no letter or digit. */
const wordsOf = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w !== '');

/** Endings a name takes in a sentence: plural and case, English and German. */
const ENDINGS = ['', 's', 'es', 'n', 'e', 'en', 'er', 'ern'];

/** True when a word of the sentence is the name's word, alone or with one of the endings. */
const isForm = (word: string, name: string): boolean =>
  ENDINGS.some((ending) => word === name + ending) ||
  // "potatoes" names "potato", "berries" names "berry".
  (name.endsWith('y') && word === `${name.slice(0, -1)}ies`);

/**
 * True when the sentence names the line: every word of one of its names, up to the first comma
 * ("Potatoes, white" is "potatoes"), stands in the sentence, alone or with a plural or case ending.
 */
const mentions = (words: readonly string[], name: string): boolean => {
  const wanted = wordsOf(name.split(',')[0] ?? '');
  return (
    wanted.length > 0 &&
    wanted.every((n) => words.some((w) => isForm(w, n) || (n.length > 3 && isForm(n, w))))
  );
};

interface Hit {
  word: StepWord;
  at: number;
  length: number;
  chars: number;
}

/** Where a pattern stands in the sentence: its words next to each other, each begun by the pattern's word. */
const positions = (words: readonly string[], pattern: readonly string[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i + pattern.length <= words.length; i += 1) {
    if (pattern.every((p, j) => (words[i + j] as string).startsWith(p))) out.push(i);
  }
  return out;
};

const TIME_UNITS: readonly [RegExp, StepTime['unit']][] = [
  [/^(s|sek|sekunden?|sec|seconds?)$/, 's'],
  [/^(min|minuten?|minutes?)$/, 'min'],
  [/^(h|std|stunden?|hours?)$/, 'h'],
];
const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const RANGE = String.raw`(?:\s*(?:-|–|bis|to)\s*${NUMBER})?`;
const TIME = new RegExp(String.raw`${NUMBER}${RANGE}\s*(\p{L}+)`, 'giu');
const TEMPERATURE = new RegExp(
  String.raw`${NUMBER}${RANGE}\s*(?:°\s*(c|f)\b|(grad)(?:\s+(celsius|fahrenheit))?|degrees\s+(celsius|fahrenheit|c\b|f\b))`,
  'iu',
);
const number = (text: string): number => Number(text.replace(',', '.'));

const timeOf = (text: string): StepTime | undefined => {
  for (const m of text.matchAll(TIME)) {
    const unit = TIME_UNITS.find(([pattern]) => pattern.test((m[3] as string).toLowerCase()))?.[1];
    if (unit === undefined) continue;
    const value = number(m[1] as string);
    const to = m[2] === undefined ? undefined : number(m[2]);
    if (!(value > 0)) continue;
    return { value, ...(to !== undefined && to > value ? { to } : {}), unit };
  }
  return undefined;
};

const temperatureOf = (text: string): StepTemperature | undefined => {
  const m = TEMPERATURE.exec(text);
  if (m === null) return undefined;
  const value = number(m[1] as string);
  const to = m[2] === undefined ? undefined : number(m[2]);
  // "180 Grad" in a German sentence is Celsius; a bare degree sign or "degrees" names no scale.
  const scale = (m[3] ?? m[5] ?? m[6] ?? (m[4] === undefined ? undefined : 'c'))?.toLowerCase();
  if (scale === undefined || !(value > 0)) return undefined;
  return {
    value,
    ...(to !== undefined && to > value ? { to } : {}),
    unit: scale.startsWith('f') ? 'F' : 'C',
  };
};

/**
 * What one sentence of a recipe suggests for a step.
 *
 * - **What is done:** the technique or plain action whose word stands first in the sentence. A
 *   pattern of the list matches where its words stand next to each other, each beginning a word of
 *   the sentence ("anbrat" matches "anbraten"). Of two at the same place the one of more words
 *   wins, then the longer one, then the technique.
 * - **What goes in:** every line one of whose names stands in the sentence (see `mentions`).
 * - **Time:** the first number, or range, before a unit of time (s, min, h and their words in
 *   English and German).
 * - **Temperature:** a number or range before `°C`, `°F`, "degrees Celsius/Fahrenheit" or "Grad"
 *   (Celsius unless Fahrenheit is said). A bare degree sign gives none.
 *
 * @param text - One sentence or step of a recipe, in English or German.
 * @param lines - The lines of the recipe with their names.
 * @param vocabulary - The word lists; the shipped ones by default.
 * @returns The proposal; `uses` is empty and the other parts absent where nothing was found.
 */
export function proposeStep(
  text: string,
  lines: readonly ProposalLine[] = [],
  vocabulary: StepVocabulary = STEP_VOCABULARY,
): StepProposal {
  const words = wordsOf(text);
  const hits: Hit[] = [];
  for (const kind of ['technique', 'action'] as const) {
    const lists = kind === 'technique' ? vocabulary.techniques : vocabulary.actions;
    for (const [id, byLang] of Object.entries(lists)) {
      for (const phrase of [...byLang.en, ...byLang.de]) {
        const pattern = wordsOf(phrase);
        if (pattern.length === 0) continue;
        for (const at of positions(words, pattern)) {
          hits.push({ word: { kind, id }, at, length: pattern.length, chars: phrase.length });
        }
      }
    }
  }
  hits.sort(
    (a, b) =>
      a.at - b.at ||
      b.length - a.length ||
      b.chars - a.chars ||
      Number(a.word.kind === 'action') - Number(b.word.kind === 'action') ||
      a.word.id.localeCompare(b.word.id),
  );
  const first = hits[0];
  const time = timeOf(text);
  const temperature = temperatureOf(text);
  return {
    ...(first === undefined
      ? {}
      : { word: first.word, matched: words.slice(first.at, first.at + first.length).join(' ') }),
    uses: lines
      .filter((line) => line.names.some((name) => mentions(words, name)))
      .map((l) => l.key),
    ...(time === undefined ? {} : { time }),
    ...(temperature === undefined ? {} : { temperature }),
  };
}
