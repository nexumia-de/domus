// The proposal of a step from one sentence (docs/engine-rules.md, "Proposing a step"): what is
// done by a word list, the lines by their names, time and temperature by their units. It proposes;
// the user confirms. The last test pins a limit, not a wish.
import { describe, expect, test } from 'vitest';
import { ACTIONS, STEP_VOCABULARY, TECHNIQUES, proposeStep } from '../src/index';
import type { ProposalLine } from '../src/index';

const LINES: ProposalLine[] = [
  { key: 'beef', names: ['Beef', 'Rindfleisch'] },
  { key: 'onion', names: ['Onions', 'Zwiebel'] },
  { key: 'butter', names: ['Butter'] },
  { key: 'egg', names: ['Egg', 'Ei'] },
  { key: 'potato', names: ['Potatoes, white, flesh and skin', 'Kartoffel'] },
  { key: 'flour', names: ['Wheat flour', 'Mehl'] },
];
const word = (text: string): string | undefined => {
  const found = proposeStep(text, LINES).word;
  return found === undefined ? undefined : `${found.kind}:${found.id}`;
};
const uses = (text: string): string[] => proposeStep(text, LINES).uses;

describe('the word lists', () => {
  test('every technique and every plain action has words in both languages, and no other id has', () => {
    expect(Object.keys(STEP_VOCABULARY.techniques).sort()).toEqual(
      TECHNIQUES.map((t) => t.id).sort(),
    );
    expect(Object.keys(STEP_VOCABULARY.actions).sort()).toEqual(ACTIONS.map((a) => a.id).sort());
    for (const lists of [STEP_VOCABULARY.techniques, STEP_VOCABULARY.actions]) {
      for (const [id, byLang] of Object.entries(lists)) {
        for (const lang of ['en', 'de'] as const) {
          expect(byLang[lang].length, `${id} ${lang}`).toBeGreaterThan(0);
          for (const phrase of byLang[lang]) {
            expect(phrase, `${id} ${lang}`).toBe(phrase.trim().toLowerCase());
            expect(phrase.length, `${id} ${lang}`).toBeGreaterThan(2);
          }
        }
      }
    }
  });
});

describe('what is done', () => {
  test('a technique by its word, in German and in English', () => {
    expect(word('Zwiebeln in Butter anschwitzen')).toBe('technique:sweat');
    expect(word('Sear the beef on all sides.')).toBe('technique:sear');
    expect(word('Den Teig kräftig kneten')).toBe('technique:knead');
    expect(word('Simmer for 20 minutes.')).toBe('technique:simmer');
    expect(word('Mit Wein ablöschen')).toBe('technique:deglaze');
  });
  test('a plain action by its word', () => {
    expect(word('Set aside.')).toBe('action:set-aside');
    expect(word('Die Nudeln abgießen')).toBe('action:drain');
    expect(word('Mit Salz abschmecken')).toBe('action:taste');
    expect(word('Den Ofen auf 200 °C vorheizen')).toBe('action:preheat');
  });
  test('the word that stands first in the sentence is proposed', () => {
    expect(word('Abgießen und in Butter schwenken')).toBe('action:drain');
    expect(word('In Butter schwenken, dann abgießen')).toBe('technique:saute');
  });
  test('at the same place the pattern of more words wins', () => {
    const sear = proposeStep('Das Fleisch scharf anbraten');
    expect(sear.word).toEqual({ kind: 'technique', id: 'sear' });
    expect(sear.matched).toBe('scharf anbraten');
    // "Mehl anschwitzen" is a roux, not sweating.
    expect(word('Mehl anschwitzen und mit Milch aufgießen')).toBe('technique:roux');
    expect(word('Cook the pasta until al dente')).toBe('technique:cook-pasta');
  });
  test('a pattern begins a word, it does not sit inside one', () => {
    // "anbraten" is searing; "braten" alone is pan-frying.
    expect(word('In der Pfanne braten')).toBe('technique:pan-fry');
    expect(word('Kurz anbraten')).toBe('technique:sear');
    // "Backofen" is not baking.
    expect(word('Backofen vorheizen')).toBe('action:preheat');
  });
  test('a sentence without a known word proposes none', () => {
    expect(proposeStep('Voilà.')).toEqual({ uses: [] });
    expect(proposeStep('')).toEqual({ uses: [] });
  });
});

describe('what goes in', () => {
  test('the lines whose names stand in the sentence, in the order of the lines', () => {
    expect(uses('Zwiebeln in Butter anschwitzen')).toEqual(['onion', 'butter']);
    expect(uses('Sear the beef, then add the onions.')).toEqual(['beef', 'onion']);
  });
  test('a name takes a plural or case ending, in both languages', () => {
    expect(uses('Die Kartoffeln schälen')).toEqual(['potato']);
    expect(uses('Peel the potato')).toEqual(['potato']);
    expect(uses('Zwei Eier trennen')).toEqual(['egg']);
    expect(uses('Add an onion')).toEqual(['onion']);
  });
  test('a name is a whole word: "eine" is no egg and "Buttermilch" no butter', () => {
    expect(uses('Eine Prise Salz zugeben')).toEqual([]);
    expect(uses('Buttermilch angießen')).toEqual([]);
  });
  test('a catalogue name counts up to its first comma, and every word of a name must stand', () => {
    expect(uses('Boil the potatoes')).toEqual(['potato']);
    expect(uses('Sift the flour')).toEqual([]);
    expect(uses('Sift the wheat flour')).toEqual(['flour']);
    expect(uses('Das Mehl sieben')).toEqual(['flour']);
  });
  test('without lines nothing is used', () => {
    expect(proposeStep('Zwiebeln anschwitzen').uses).toEqual([]);
  });
});

describe('time and temperature', () => {
  test('a number or a range before a unit of time', () => {
    expect(proposeStep('Simmer for 20 minutes.').time).toEqual({ value: 20, unit: 'min' });
    expect(proposeStep('30 bis 40 Minuten backen').time).toEqual({
      value: 30,
      to: 40,
      unit: 'min',
    });
    expect(proposeStep('Braise 2-3 h').time).toEqual({ value: 2, to: 3, unit: 'h' });
    expect(proposeStep('1,5 Stunden schmoren').time).toEqual({ value: 1.5, unit: 'h' });
    expect(proposeStep('30 Sekunden blanchieren').time).toEqual({ value: 30, unit: 's' });
  });
  test('a number before something that is no unit of time is no time', () => {
    expect(proposeStep('Add 200 g flour').time).toBeUndefined();
    expect(proposeStep('2 Eier und 10 Minuten Geduld').time).toEqual({ value: 10, unit: 'min' });
  });
  test('a temperature needs its scale; "Grad" in German is Celsius', () => {
    expect(proposeStep('Bei 180 °C backen').temperature).toEqual({ value: 180, unit: 'C' });
    expect(proposeStep('Bake at 350 °F').temperature).toEqual({ value: 350, unit: 'F' });
    expect(proposeStep('Bei 160 bis 180 Grad backen').temperature).toEqual({
      value: 160,
      to: 180,
      unit: 'C',
    });
    expect(proposeStep('Bake at 400 degrees Fahrenheit').temperature).toEqual({
      value: 400,
      unit: 'F',
    });
    expect(proposeStep('Bake at 350 degrees').temperature).toBeUndefined();
    expect(proposeStep('Bake at 350°').temperature).toBeUndefined();
  });
  test('one sentence gives all parts together', () => {
    expect(proposeStep('Das Rindfleisch 10 Minuten bei 200 °C scharf anbraten', LINES)).toEqual({
      word: { kind: 'technique', id: 'sear' },
      matched: 'scharf anbraten',
      uses: ['beef'],
      time: { value: 10, unit: 'min' },
      temperature: { value: 200, unit: 'C' },
    });
  });
});

describe('sentences of the shipped dishes that the lists got wrong before 2026-11-20', () => {
  test('"garen" is cooking, not the proof of a dough', () => {
    expect(word('Bei schwacher Hitze garen, bis die Oberseite trocken ist.')).toBe('action:cook');
    expect(word('Den Teig zugedeckt gehen lassen')).toBe('technique:proof-yeast');
  });
  test('"the heat" as a noun is not heating; taking the pan off it has its own word', () => {
    expect(word('Take the pan off the heat.')).toBe('action:remove-from-heat');
    expect(word('Die Pfanne vom Feuer nehmen.')).toBe('action:remove-from-heat');
    expect(word('Remove from the heat and add the butter')).toBe('action:remove-from-heat');
    expect(word('Melt the butter in the pan over low heat.')).toBe('action:melt');
    expect(word('Heat the oil in a large frying pan.')).toBe('action:heat');
  });
  test('the German "Form" (a mould) is not shaping', () => {
    expect(word('Jede Lage mit der Sauce bedecken und so die Form füllen.')).toBe('action:fill');
    expect(word('Die Masse zu einem Laib formen')).toBe('action:shape');
  });
  test('"binden" alone is tying as well as thickening, so it proposes nothing', () => {
    expect(word('Das Fleisch mit Küchengarn binden')).toBeUndefined();
    expect(word('Die Sauce binden')).toBe('technique:thicken-with-starch');
  });
  test('beating, pouring and sprinkling have a word', () => {
    expect(word('Beat the eggs, the starch and the milk thoroughly.')).toBe('action:whisk');
    expect(word('Beat the egg whites to a froth.')).toBe('technique:whip-egg-whites');
    expect(word('Pour the sauce over the pieces.')).toBe('action:pour');
    expect(word('Den Teig in die Pfanne gießen')).toBe('action:pour');
    expect(word('Sprinkle sugar and cinnamon over it.')).toBe('action:sprinkle');
    expect(word('Zucker und Zimt darüberstreuen.')).toBe('action:sprinkle');
    expect(word('Pass the mixture through a sieve.')).toBe('action:strain');
  });
  test('"cook" is proposed only as a verb with its object or manner', () => {
    expect(word('Cook the soup for half an hour.')).toBe('action:cook');
    expect(word('After the cooking time, take the beans out and drain them.')).toBe('action:drain');
    expect(word('Cook the pasta in salted water.')).toBe('technique:cook-pasta');
  });
});

describe('a known limit', () => {
  test('the list knows words, not grammar: a noun that is also a verb is taken for the verb', () => {
    // "the lemon peel" is a noun here; the cook wanted "add". The user corrects it.
    expect(word('Put the milk, the sugar and the lemon peel into a pot.')).toBe('action:peel');
    // A participle counts as the verb: the potatoes are already boiled, the step cuts them.
    expect(word('Die gekochten Kartoffeln in Scheiben schneiden.')).toBe('technique:boil');
    // A separated German verb ("brate ... an") is not found.
    expect(word('Brate das Fleisch an')).toBeUndefined();
  });
});
