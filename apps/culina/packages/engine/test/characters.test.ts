// The character rules on facts worked out by hand: presence, the share by mass and where it is
// not judged, techniques, the figures per 100 g, `unless`, and the order of the table.
import { describe, expect, test } from 'vitest';
import {
  correctCharacters,
  correctionOf,
  correctionText,
  dishCharacters,
  shareOf,
} from '../src/index';
import type { CharacterFacts, CharacterRule } from '../src/index';

const TOMATO: CharacterRule = {
  id: 'tomatoey',
  when: [{ ingredients: ['tomatoes'], minShare: 0.15 }],
};
const GARLIC: CharacterRule = {
  id: 'garlicky',
  when: [{ ingredients: ['garlic'], minShare: 0.015, presence: false }],
};

const facts = (
  lines: CharacterFacts['lines'],
  techniques: string[] = [],
  stepsKnown = true,
): CharacterFacts => ({ lines, techniques, stepsKnown });

const ids = (f: CharacterFacts, rules: CharacterRule[]): string[] =>
  dishCharacters(f, rules).characters.map((c) => c.id);

describe('share by mass', () => {
  test('300 g of tomato in 1000 g is a share of 0.3 and above 0.15', () => {
    const f = facts([
      { classes: ['fdc-1', 'tomatoes'], g: 300 },
      { classes: ['pasta'], g: 700 },
    ]);
    expect(shareOf(f, ['tomatoes'])).toBe(0.3);
    expect(dishCharacters(f, [TOMATO]).characters).toEqual([
      { id: 'tomatoey', reason: { clause: 0, by: 'share', share: 0.3 } },
    ]);
  });

  test('100 g of tomato in 1000 g is below the threshold', () => {
    const f = facts([
      { classes: ['tomatoes'], g: 100 },
      { classes: ['pasta'], g: 900 },
    ]);
    expect(ids(f, [TOMATO])).toEqual([]);
  });

  test('two lines of the class are summed: 100 g + 100 g of 1000 g is 0.2', () => {
    const f = facts([
      { classes: ['tomatoes'], g: 100 },
      { classes: ['paste', 'tomatoes'], g: 100 },
      { classes: ['pasta'], g: 800 },
    ]);
    expect(shareOf(f, ['tomatoes'])).toBe(0.2);
  });
});

describe('where the share is not known', () => {
  const unmeasured = facts([
    { classes: ['tomatoes'] },
    { classes: ['garlic'] },
    { classes: ['pasta'], g: 500 },
  ]);

  test('one line of three measured: not covered, no share', () => {
    const result = dishCharacters(unmeasured, [TOMATO]);
    expect(result.coverage).toEqual({ lines: 3, measured: 1, covered: false });
    expect(shareOf(unmeasured, ['tomatoes'])).toBeUndefined();
  });

  test('presence decides by default, and not where the rule says presence is not enough', () => {
    expect(dishCharacters(unmeasured, [TOMATO, GARLIC]).characters).toEqual([
      { id: 'tomatoey', reason: { clause: 0, by: 'presence' } },
    ]);
  });

  test('covered, but the line of the class itself has no mass: presence decides', () => {
    const f = facts([
      { classes: ['tomatoes'] },
      { classes: ['pasta'], g: 500 },
      { classes: ['oil'], g: 20 },
    ]);
    expect(dishCharacters(f, [TOMATO]).coverage.covered).toBe(true);
    expect(dishCharacters(f, [TOMATO]).characters[0]?.reason.by).toBe('presence');
  });

  test('exactly half of the lines measured is covered', () => {
    const f = facts([{ classes: ['tomatoes'], g: 10 }, { classes: ['pasta'] }]);
    expect(dishCharacters(f, []).coverage.covered).toBe(true);
  });

  test('a dish without lines has no character by ingredient', () => {
    expect(dishCharacters(facts([]), [TOMATO]).coverage).toEqual({
      lines: 0,
      measured: 0,
      covered: false,
    });
    expect(ids(facts([]), [TOMATO])).toEqual([]);
  });
});

describe('techniques', () => {
  const FRIED: CharacterRule = { id: 'fried', when: [{ techniques: ['pan-fry', 'deep-fry'] }] };
  const COLD: CharacterRule = { id: 'cold', when: [{ withoutTechniques: ['boil', 'pan-fry'] }] };

  test('a named technique gives the character', () => {
    expect(ids(facts([], ['knife-cuts', 'pan-fry']), [FRIED, COLD])).toEqual(['fried']);
  });

  test('none of the heat techniques: cold, but only where steps are known', () => {
    expect(ids(facts([], ['cold-emulsion']), [FRIED, COLD])).toEqual(['cold']);
    expect(ids(facts([], [], false), [FRIED, COLD])).toEqual([]);
  });

  test('ingredient and technique in one clause must both hold', () => {
    const rule: CharacterRule = {
      id: 'creamy',
      when: [{ ingredients: ['milk'], techniques: ['roux'] }],
    };
    expect(ids(facts([{ classes: ['milk'] }], ['roux']), [rule])).toEqual(['creamy']);
    expect(ids(facts([{ classes: ['milk'] }], ['bake']), [rule])).toEqual([]);
    expect(ids(facts([{ classes: ['flour'] }], ['roux']), [rule])).toEqual([]);
  });
});

describe('figures per 100 g', () => {
  const RICH: CharacterRule = { id: 'rich', when: [{ fat: { min: 15 } }] };
  const LIGHT: CharacterRule = { id: 'light', when: [{ kcal: { max: 90 }, fat: { max: 3 } }] };

  test('100 g butter (81 g fat) and 300 g potato (0.1 g): 81.3 g fat in 400 g is 20.325 per 100 g', () => {
    const f = facts([
      { classes: ['butter'], g: 100, fatPer100g: 81, kcalPer100g: 717 },
      { classes: ['potato'], g: 300, fatPer100g: 0.1, kcalPer100g: 77 },
    ]);
    expect(dishCharacters(f, [RICH, LIGHT]).characters).toEqual([
      { id: 'rich', reason: { clause: 0, by: 'figures' } },
    ]);
  });

  test('a measured line without the figure: nothing is said', () => {
    const f = facts([
      { classes: ['butter'], g: 100, fatPer100g: 81, kcalPer100g: 717 },
      { classes: ['mystery'], g: 300 },
    ]);
    expect(ids(f, [RICH, LIGHT])).toEqual([]);
  });

  test('not covered: nothing is said', () => {
    const f = facts([
      { classes: ['butter'], g: 100, fatPer100g: 81, kcalPer100g: 717 },
      { classes: ['a'] },
      { classes: ['b'] },
    ]);
    expect(ids(f, [RICH])).toEqual([]);
  });

  test('three of four lines measured covers a share, not the figures (four of five needed)', () => {
    const butter = { classes: ['butter'], g: 100, fatPer100g: 81, kcalPer100g: 717 };
    expect(ids(facts([butter, butter, butter, { classes: ['meat'] }]), [RICH])).toEqual([]);
    expect(ids(facts([butter, butter, butter, butter, { classes: ['salt'] }]), [RICH])).toEqual([
      'rich',
    ]);
  });

  test('both bounds of a clause must hold', () => {
    const f = facts([{ classes: ['cucumber'], g: 200, fatPer100g: 0.1, kcalPer100g: 15 }]);
    expect(ids(f, [RICH, LIGHT])).toEqual(['light']);
  });
});

describe('the table', () => {
  test('unless takes a character away', () => {
    const rule: CharacterRule = {
      id: 'creamy',
      when: [{ ingredients: ['cream'] }],
      unless: [{ techniques: ['deep-fry'] }],
    };
    expect(ids(facts([{ classes: ['cream'] }], ['simmer']), [rule])).toEqual(['creamy']);
    expect(ids(facts([{ classes: ['cream'] }], ['deep-fry']), [rule])).toEqual([]);
  });

  test('the reason is the first clause that holds; the order is the order of the table', () => {
    const a: CharacterRule = {
      id: 'a',
      when: [{ techniques: ['x'] }, { ingredients: ['milk'] }],
    };
    const b: CharacterRule = { id: 'b', when: [{ ingredients: ['milk'] }] };
    expect(dishCharacters(facts([{ classes: ['milk'] }]), [b, a]).characters).toEqual([
      { id: 'b', reason: { clause: 0, by: 'presence' } },
      { id: 'a', reason: { clause: 1, by: 'presence' } },
    ]);
  });

  test('a clause without conditions never holds', () => {
    expect(ids(facts([{ classes: ['milk'], g: 1 }]), [{ id: 'x', when: [{}] }])).toEqual([]);
  });
});

describe('more ingredients and the course', () => {
  const MAYO: CharacterRule = {
    id: 'creamy',
    when: [{ ingredients: ['yolk'], alsoIngredients: [['oil']], techniques: ['cold-emulsion'] }],
  };
  const SWEET: CharacterRule = {
    id: 'sweet',
    when: [{ ingredients: ['sugar'], courses: ['dessert', 'baking'] }],
  };

  test('alsoIngredients: every list must have a line as well, by presence', () => {
    const yolkAndOil = facts([{ classes: ['yolk'] }, { classes: ['oil'] }], ['cold-emulsion']);
    expect(dishCharacters(yolkAndOil, [MAYO]).characters).toEqual([
      { id: 'creamy', reason: { clause: 0, by: 'presence' } },
    ]);
    expect(ids(facts([{ classes: ['yolk'] }], ['cold-emulsion']), [MAYO])).toEqual([]);
    expect(ids(facts([{ classes: ['oil'] }], ['cold-emulsion']), [MAYO])).toEqual([]);
  });

  test('courses: the course the dish states must be one of them; no course, no match', () => {
    const sugar = [{ classes: ['sugar'] }];
    expect(ids({ ...facts(sugar), course: 'dessert' }, [SWEET])).toEqual(['sweet']);
    expect(ids({ ...facts(sugar), course: 'soup' }, [SWEET])).toEqual([]);
    expect(ids(facts(sugar), [SWEET])).toEqual([]);
  });

  test('a clause of a course alone gives the reason course; in unless it takes the character away', () => {
    const rule: CharacterRule = { id: 'x', when: [{ courses: ['soup'] }] };
    expect(dishCharacters({ ...facts([]), course: 'soup' }, [rule]).characters).toEqual([
      { id: 'x', reason: { clause: 0, by: 'course' } },
    ]);
    const fried: CharacterRule = {
      id: 'fried',
      when: [{ techniques: ['pan-fry'] }],
      unless: [{ courses: ['soup', 'sauce'] }],
    };
    expect(ids({ ...facts([], ['pan-fry']), course: 'main' }, [fried])).toEqual(['fried']);
    expect(ids({ ...facts([], ['pan-fry']), course: 'soup' }, [fried])).toEqual([]);
    expect(ids(facts([], ['pan-fry']), [fried])).toEqual(['fried']);
  });
});

describe("the cook's correction", () => {
  const ORDER = ['tomatoey', 'garlicky', 'fried', 'creamy'];

  test('without a correction the computed characters stay, in the order of the table', () => {
    expect(correctCharacters(['fried', 'tomatoey'], undefined, ORDER)).toEqual([
      'tomatoey',
      'fried',
    ]);
    expect(correctCharacters(['fried'], {}, ORDER)).toEqual(['fried']);
  });

  test('a removed character is not shown, an added one is, in the order of the table', () => {
    expect(
      correctCharacters(['tomatoey', 'fried'], { add: ['creamy'], remove: ['fried'] }, ORDER),
    ).toEqual(['tomatoey', 'creamy']);
  });

  test('removing what no rule gives and adding what a rule gives change nothing', () => {
    expect(
      correctCharacters(['tomatoey'], { add: ['tomatoey'], remove: ['fried'] }, ORDER),
    ).toEqual(['tomatoey']);
  });

  test('an id in both lists is shown', () => {
    expect(correctCharacters([], { add: ['fried'], remove: ['fried'] }, ORDER)).toEqual(['fried']);
    expect(correctCharacters(['fried'], { add: ['fried'], remove: ['fried'] }, ORDER)).toEqual([
      'fried',
    ]);
  });

  test('an id the table does not know is left out', () => {
    expect(correctCharacters(['smoky'], { add: ['gone'] }, ORDER)).toEqual([]);
  });

  test('a later change of the recipe still shows: the correction is not the whole set', () => {
    const correction = { remove: ['fried'] };
    expect(correctCharacters(['fried'], correction, ORDER)).toEqual([]);
    expect(correctCharacters(['fried', 'garlicky'], correction, ORDER)).toEqual(['garlicky']);
  });

  test('the correction that leads from the computed to the shown set', () => {
    expect(correctionOf(['tomatoey', 'fried'], ['tomatoey', 'creamy'], ORDER)).toEqual({
      add: ['creamy'],
      remove: ['fried'],
    });
    expect(correctionOf(['fried'], ['fried', 'creamy', 'garlicky'], ORDER)).toEqual({
      add: ['garlicky', 'creamy'],
    });
    expect(correctionOf(['fried', 'tomatoey'], ['tomatoey', 'fried'], ORDER)).toBeUndefined();
    expect(correctionOf([], ['gone'], ORDER)).toBeUndefined();
  });

  test('applying the correction of a shown set gives that set again', () => {
    const computed = ['tomatoey', 'fried'];
    for (const shown of [[], ['creamy'], ['tomatoey', 'fried'], ORDER]) {
      expect(correctCharacters(computed, correctionOf(computed, shown, ORDER), ORDER)).toEqual(
        ORDER.filter((id) => shown.includes(id)),
      );
    }
  });

  test('as one text: added first, then removed', () => {
    expect(correctionText({ add: ['creamy'], remove: ['fried', 'baked'] })).toBe(
      '+creamy, -fried, -baked',
    );
    expect(correctionText(undefined)).toBeUndefined();
    expect(correctionText({})).toBeUndefined();
  });
});
