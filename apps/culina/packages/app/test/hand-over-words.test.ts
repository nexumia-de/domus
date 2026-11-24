// What the cook reads of a hand-over (src/shared-list/words.ts): the offer for 0, 1 and n lines
// lacking and when this page listed some or all of them, the message after the write (joined
// lines, lines already there, amounts that differ), Undo's sentence against the list as it is;
// exact strings in English and German. What this does not prove: that the dish page shows them
// where it should (e2e/hand-over.mjs), and that the outcomes come from a real write
// (test/hand-over.test.ts); the lines here are made up as the write returns them.
import { describe, expect, test } from 'vitest';
import type { HandOverLine, UndoOutcome } from '../src/shared-list/hand-over';
import { handOverSaid, offerText, undoSaid, writtenNames } from '../src/shared-list/words';
import { handOverStringsDe } from '../src/de/strings-handover';
import { handOverStrings } from '../src/strings-handover';

const en = handOverStrings;
const de = handOverStringsDe;

const line = (
  name: string,
  outcome: HandOverLine['outcome'],
  extra: Partial<HandOverLine> = {},
): HandOverLine => ({
  name,
  outcome,
  ...(outcome === 'empty' ? {} : { id: `u-${name}` }),
  ...extra,
});

const outcome = (over: Partial<UndoOutcome>): UndoOutcome => ({
  undone: [],
  kept: [],
  restored: [],
  gone: [],
  bought: [],
  ...over,
});

describe('the offer', () => {
  test('nothing when nothing lacks or it cannot be judged', () => {
    expect(offerText(0, en)).toBeUndefined();
    expect(offerText(undefined, en)).toBeUndefined();
    expect(offerText(0, de)).toBeUndefined();
  });
  test('one and several, in English and German', () => {
    expect(offerText(1, en)).toEqual({
      text: 'The stock lacks 1 ingredient for this.',
      button: true,
    });
    expect(offerText(6, en)?.text).toBe('The stock lacks 6 ingredients for this.');
    expect(offerText(1, de)?.text).toBe('Laut Vorrat ist dafür noch 1 Zutat nötig.');
    expect(offerText(6, de)?.text).toBe('Laut Vorrat sind dafür noch 6 Zutaten nötig.');
  });
  test('some of them on the list from this page: said, the button stays', () => {
    expect(offerText(6, en, 4)).toEqual({
      text: 'The stock lacks 6 ingredients for this; 4 of them on the shopping list as needed now.',
      button: true,
    });
    expect(offerText(6, de, 4)?.text).toBe(
      'Laut Vorrat sind dafür noch 6 Zutaten nötig, 4 davon wie jetzt gebraucht auf der Einkaufsliste.',
    );
  });
  test('all of them on the list: said, and no button', () => {
    expect(offerText(6, en, 6)).toEqual({
      text: 'The 6 ingredients the stock lacks for this are on the shopping list.',
      button: false,
    });
    expect(offerText(1, en, 1)?.text).toBe(
      'The 1 ingredient the stock lacks for this is on the shopping list.',
    );
    expect(offerText(6, de, 6)?.text).toBe(
      'Die 6 Zutaten, die laut Vorrat dafür nötig sind, stehen auf der Einkaufsliste.',
    );
    expect(offerText(1, de, 1)?.text).toBe(
      'Die 1 Zutat, die laut Vorrat dafür nötig ist, steht auf der Einkaufsliste.',
    );
  });
});

describe('the message after a hand-over', () => {
  test('so many put on the list; an empty name is not counted', () => {
    const lines = [line('Butter', 'added'), line('Salt', 'added'), line('', 'empty')];
    expect(handOverSaid(lines, en)).toEqual({
      text: 'Put 2 on the shopping list.',
      differences: [],
    });
    expect(handOverSaid(lines, de).text).toBe('2 auf die Einkaufsliste gesetzt.');
  });
  test('a joined line is said: it was added to an entry already there', () => {
    const some = [line('Butter', 'added'), line('Salt', 'joined')];
    expect(handOverSaid(some, en).text).toBe(
      'Put 2 on the shopping list, 1 of them added to an entry already there.',
    );
    expect(handOverSaid(some, de).text).toBe(
      '2 auf die Einkaufsliste gesetzt, 1 davon zu einem schon vorhandenen Eintrag hinzugefügt.',
    );
    const all = [line('Salt', 'joined')];
    expect(handOverSaid(all, en).text).toBe(
      'Put 1 on the shopping list, added to an entry already there.',
    );
    expect(handOverSaid(all, de).text).toBe(
      '1 auf die Einkaufsliste gesetzt, zu einem schon vorhandenen Eintrag hinzugefügt.',
    );
  });
  test('some there already, said beside what was put', () => {
    const lines = [line('Butter', 'added'), line('Salt', 'already'), line('Eggs', 'already')];
    expect(handOverSaid(lines, en).text).toBe('Put 1 on the shopping list. 2 were on it already.');
    expect(handOverSaid(lines.slice(0, 2), en).text).toBe(
      'Put 1 on the shopping list. 1 was on it already.',
    );
    expect(handOverSaid(lines, de).text).toBe(
      '1 auf die Einkaufsliste gesetzt. 2 standen schon darauf.',
    );
    expect(handOverSaid(lines.slice(0, 2), de).text).toBe(
      '1 auf die Einkaufsliste gesetzt. 1 stand schon darauf.',
    );
  });
  test('everything there already: one by its name, several by their number', () => {
    expect(handOverSaid([line('Tomatoes', 'already')], en).text).toBe(
      'Tomatoes: on the shopping list already.',
    );
    expect(handOverSaid([line('Tomaten', 'already')], de).text).toBe(
      'Tomaten: schon auf der Einkaufsliste.',
    );
    const two = [line('Salt', 'already'), line('Eggs', 'already')];
    expect(handOverSaid(two, en).text).toBe('All 2 were on the shopping list already.');
    expect(handOverSaid(two, de).text).toBe('Alle 2 standen schon auf der Einkaufsliste.');
  });
  test('amounts that differ: one sentence in the message, the lines apart; an equal one is not listed', () => {
    const lines = [
      line('Butter', 'already', { listed: '200 g', asked: '300 g' }),
      line('Salt', 'already', { listed: '1 tsp', asked: '1 tsp' }),
      line('Beef', 'already'),
      line('Tomatoes', 'already', { asked: '3 pcs' }),
    ];
    expect(handOverSaid(lines, en)).toEqual({
      text: 'All 4 were on the shopping list already. For 2 of them the list has a different amount from what the dish needs now; the list was not changed.',
      differences: [
        'Butter: on the list 200 g, needed now 300 g',
        'Tomatoes: on the list without an amount, needed now 3 pcs',
      ],
    });
    expect(handOverSaid(lines.slice(0, 1), en).text).toBe(
      'Butter: on the shopping list already. For 1 of them the list has a different amount from what the dish needs now; the list was not changed.',
    );
    expect(handOverSaid(lines, de)).toEqual({
      text: 'Alle 4 standen schon auf der Einkaufsliste. Bei 2 davon hat die Liste eine andere Menge, als das Gericht jetzt braucht; die Liste blieb unverändert.',
      differences: [
        'Butter: auf der Liste 200 g, jetzt gebraucht 300 g',
        'Tomatoes: auf der Liste ohne Menge, jetzt gebraucht 3 pcs',
      ],
    });
  });
});

describe('Undo', () => {
  const lines = [line('Butter', 'added'), line('Salt', 'joined'), line('Eggs', 'already')];
  const names = writtenNames(lines);
  test('the names are those of the entries written: an already line is never among them', () => {
    expect([...names]).toEqual([
      ['u-Butter', 'Butter'],
      ['u-Salt', 'Salt'],
    ]);
    // The same entry as an already line of this hand-over and as a written line of another dish
    // is named by the written line only.
    const shared = [line('Sahne', 'added', { id: 'u-x' }), line('Cream', 'already', { id: 'u-x' })];
    expect(writtenNames(shared).get('u-x')).toBe('Sahne');
    expect(writtenNames([line('Eggs', 'already')]).size).toBe(0);
  });
  test('an added entry is taken off the list', () => {
    const done = outcome({ undone: ['u-Butter'] });
    expect(undoSaid(names, done, en)).toBe('Taken off the list: Butter.');
    expect(undoSaid(names, done, de)).toBe('Von der Liste genommen: Butter.');
  });
  test('a joined entry stays, back as it was before this dish', () => {
    const done = outcome({ undone: ['u-Butter', 'u-Salt'], restored: ['u-Salt'] });
    expect(undoSaid(names, done, en)).toBe(
      'Taken off the list: Butter. Back as before, without this dish: Salt.',
    );
    expect(undoSaid(names, done, de)).toBe(
      'Von der Liste genommen: Butter. Wieder wie vorher, ohne dieses Gericht: Salt.',
    );
  });
  test('an entry ticked or changed since is left', () => {
    const done = outcome({ undone: ['u-Butter'], kept: ['u-Salt'] });
    expect(undoSaid(names, done, en)).toBe(
      'Taken off the list: Butter. Left on the list, ticked or changed since: Salt.',
    );
    expect(undoSaid(names, done, de)).toBe(
      'Von der Liste genommen: Butter. Auf der Liste gelassen, seither abgehakt oder geändert: Salt.',
    );
  });
  test('an entry removed in the shopping list since is said to be no longer on it', () => {
    const done = outcome({ undone: ['u-Butter'], kept: ['u-Salt'], gone: ['u-Salt'] });
    expect(undoSaid(names, done, en)).toBe(
      'Taken off the list: Butter. No longer on the list: Salt.',
    );
    expect(undoSaid(names, done, de)).toBe(
      'Von der Liste genommen: Butter. Nicht mehr auf der Liste: Salt.',
    );
  });
  test('nothing taken back: said first, then why', () => {
    const done = outcome({ kept: ['u-Butter', 'u-Salt'], gone: ['u-Salt'] });
    expect(undoSaid(names, done, en)).toBe(
      'Nothing was taken back. Left on the list, ticked or changed since: Butter. No longer on the list: Salt.',
    );
    expect(undoSaid(names, done, de)).toBe(
      'Es wurde nichts zurückgenommen. Auf der Liste gelassen, seither abgehakt oder geändert: Butter. Nicht mehr auf der Liste: Salt.',
    );
  });
});
