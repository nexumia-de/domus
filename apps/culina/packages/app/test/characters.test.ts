// The character rules on the shipped data: the table against the catalogue, the facts of a
// shipped dish and of a dish of the notebook, and what the rules say of dishes everyone knows.
// The catalogue and the classics are the shipped files; the notebook is built in memory.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { isDishOfItsOwn, withoutAlternatives } from '@culina/engine';
import { CLASSICS, FRAMES } from '../src/classics/index';
import { belowOf, classesOf, conversionOf } from '../src/characters/classes';
import { factsOfClassic } from '../src/characters/classic';
import { factsOfDish } from '../src/characters/dish';
import { CHARACTER_TABLE, MEAT_AND_FISH } from '../src/characters/table';
import { entryOfDish } from '../src/browse/entry';
import { characterChips, characterIds } from '../src/characters/view';
import type { ComponentRecord, DishRecord, IngredientRecord, Notebook } from '../src/records';

const file = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../data/ingredient-catalogue.json', import.meta.url)),
    'utf8',
  ),
) as { ingredients: IngredientRecord[] };
const byId = new Map(file.ingredients.map((r) => [r.id, r]));
const lookup = (id: string): IngredientRecord | undefined => byId.get(id);
// The app builds this from the loaded catalogue; here from the shipped file.
const below = belowOf(file.ingredients);

const TOMATO = 'fdc-170457';
const CREAM = 'fdc-170859';
const PASTA = 'fdc-168927';
const version = { family: 'f', date: '2026-11-21' };

const of = (id: string): string[] => {
  const classic = CLASSICS.find((c) => c.id === id);
  if (classic === undefined) throw new Error(id);
  return characterIds(factsOfClassic(classic, lookup, below));
};

describe('the table', () => {
  test('every class is a catalogue id or a category the catalogue has', () => {
    const categories = new Set(
      file.ingredients.flatMap((r) => {
        const c = r['x-fdc']?.category ?? r['x-group']?.category;
        return c === undefined ? [] : [`category:${c}`];
      }),
    );
    const unknown = CHARACTER_TABLE.flatMap((rule) =>
      [...rule.when, ...(rule.unless ?? [])]
        .flatMap((clause) => clause.ingredients ?? [])
        .filter((c) => !byId.has(c) && !categories.has(c))
        .map((c) => `${rule.id}: ${c}`),
    );
    expect(unknown).toEqual([]);
  });

  test('ids are unique, and every row has both names and says what it rests on', () => {
    expect(new Set(CHARACTER_TABLE.map((r) => r.id)).size).toBe(CHARACTER_TABLE.length);
    for (const rule of CHARACTER_TABLE) {
      expect(rule.name.en, rule.id).not.toBe('');
      expect(rule.name.de, rule.id).not.toBe('');
      expect(rule.basis.length, rule.id).toBeGreaterThan(20);
    }
  });
});

describe('classes of an ingredient', () => {
  test('a tomato is itself, its group and its USDA category', () => {
    expect(classesOf(TOMATO, lookup)).toEqual([
      TOMATO,
      'category:Vegetables and Vegetable Products',
      'fdc-group-tomatoes',
    ]);
  });

  test('an unknown id is only itself', () => {
    expect(classesOf('u-mine', lookup)).toEqual(['u-mine']);
  });
});

describe('shipped dishes', () => {
  test('gazpacho is tomatoey and uncooked, and not creamy although it is an emulsion', () => {
    expect(of('gazpacho-andaluz')).toEqual(expect.arrayContaining(['tomatoey', 'uncooked']));
    expect(of('gazpacho-andaluz')).not.toContain('creamy');
  });

  test('sauerbraten is braised, and not fried although it is seared', () => {
    expect(of('sauerbraten')).toContain('braised');
    expect(of('sauerbraten')).not.toContain('fried');
  });

  test('Napfkuchen is from the oven and not creamy although it has milk and butter', () => {
    expect(of('napfkuchen')).toContain('baked');
    expect(of('napfkuchen')).not.toContain('creamy');
  });

  test('cauliflower with béchamel is creamy; minestrone with cheese on top is not cheesy', () => {
    expect(of('cavolfiore-balsamella')).toContain('creamy');
    expect(of('minestrone')).not.toContain('cheesy');
  });

  test('meat and fish are read from the USDA category of the line', () => {
    expect(of('sauerbraten')).toContain('with-meat');
    // Its beef names the beef group, as the source names no cut.
    expect(of('frikandelle')).toContain('with-meat');
    expect(of('marinierte-heringe')).toContain('with-fish');
    expect(of('gazpacho-andaluz')).not.toContain('with-meat');
  });

  test('a boiled dinner whose meat has no amount is not called light', () => {
    expect(of('cocido-ordinario')).not.toContain('light');
    expect(of('pot-au-feu')).not.toContain('light');
  });

  test('every shipped dish is judged', () => {
    for (const classic of CLASSICS) {
      expect(factsOfClassic(classic, lookup, below), classic.id).toBeDefined();
    }
  });
});

describe('conversion for the share', () => {
  test('a group without a weight of its own takes the one its foods agree on', () => {
    // One egg below each group states a USDA portion: 44 g whole, 17 g yolk, 33 g white.
    expect(conversionOf('fdc-group-egg-whole', lookup, below).unitWeightG).toBe(44);
    expect(conversionOf('fdc-group-egg-yolk', lookup, below).unitWeightG).toBe(17);
    expect(conversionOf('fdc-group-egg-white', lookup, below).unitWeightG).toBe(33);
  });

  test('foods that disagree give none: apples weigh 161 to 212 g, milks differ in density', () => {
    expect(conversionOf('fdc-group-apples', lookup, below).unitWeightG).toBeUndefined();
    expect(conversionOf('fdc-group-milk', lookup, below).densityGPerMl).toBeUndefined();
  });

  test('an ingredient’s own figure comes first', () => {
    expect(conversionOf('fdc-170028', lookup, below)).toEqual({ unitWeightG: 213 });
  });
});

// The rules of 2026-11-21, after reading every shipped dish as a cook would
// (docs/dish-characters.md). Each pin names the dish and why.
describe('shipped dishes, the rules of 2026-11-21', () => {
  test('eggy: omelette, soufflé and the custards, now that eggs counted in pieces have a mass', () => {
    // Before, no egg line had a mass, so eggy was said of no shipped dish.
    expect(of('omelette-fines-herbes')).toContain('eggy');
    expect(of('souffle-parmesan')).toContain('eggy');
    expect(of('crema-cotta')).toContain('eggy');
    expect(of('creme-caramel')).toContain('eggy');
    expect(of('oeufs-a-la-neige')).toContain('eggy');
  });

  test('eggy is not said where egg binds: a cake, a gratin, a purée, a meat loaf', () => {
    expect(of('torta-mantovana')).not.toContain('eggy');
    expect(of('gratin-dauphinois')).not.toContain('eggy');
    expect(of('frikandelle')).not.toContain('eggy');
    // Not covered (milk and potatoes have no mass), so not judged at all.
    expect(of('pure-de-patatas')).not.toContain('eggy');
  });

  test('not proven eggy: by the amounts of its source the tortilla is a potato dish', () => {
    // 4 eggs (176 g) to 3 lb of potatoes and 2 cups of frying oil: egg is 9 percent of the mass.
    // A judgement left as the rule gives it; the doc names it as a disputed miss.
    expect(of('tortilla-de-patatas')).not.toContain('eggy');
  });

  test('fried: a soup whose potatoes are fried first is not fried', () => {
    expect(of('potato-soup-fine')).not.toContain('fried');
    // Controls: dishes that are fried stay so.
    expect(of('tortilla-de-patatas')).toContain('fried');
    expect(of('eierkuchen')).toContain('fried');
  });

  test('fried: fennel in batter is fried, as a batter is a coat for frying', () => {
    expect(of('fritto-di-finocchi')).toEqual(expect.arrayContaining(['fried', 'crisp']));
  });

  test('creamy: a baked soufflé is set, not creamy; béchamel under a gratin crust stays creamy', () => {
    expect(of('souffle-parmesan')).not.toContain('creamy');
    expect(of('cavolfiore-balsamella')).toContain('creamy');
    expect(of('napfkuchen')).not.toContain('creamy');
  });

  test('creamy: mayonnaise and alioli (oil bound by egg yolk), not gazpacho (no yolk)', () => {
    expect(of('mayonnaise')).toContain('creamy');
    expect(of('alioli')).toContain('creamy');
    expect(of('gazpacho-andaluz')).not.toContain('creamy');
  });

  test('creamy: potatoes baked in milk (gratin dauphinois)', () => {
    expect(of('gratin-dauphinois')).toContain('creamy');
    expect(of('baked-potatoes-cheese')).toContain('creamy');
  });

  test('cheesy: cheese baked into or onto a dish; not grated over a soup or a risotto', () => {
    expect(of('baked-potatoes-cheese')).toContain('cheesy');
    expect(of('gratin-dauphinois')).toContain('cheesy');
    expect(of('souffle-parmesan')).toContain('cheesy');
    expect(of('minestrone')).not.toContain('cheesy');
    expect(of('risotto-alla-milanese')).not.toContain('cheesy');
  });

  test('garlicky: raw garlic in alioli; one clove in a cooked tomato sauce is not', () => {
    expect(of('alioli')).toContain('garlicky');
    expect(of('salsa-di-pomodoro')).not.toContain('garlicky');
  });

  test('sweet: desserts and cakes with sugar; not a soup with 5 g of sugar', () => {
    expect(of('creme-caramel')).toContain('sweet');
    expect(of('pommes-au-beurre')).toContain('sweet');
    expect(of('napfkuchen')).toContain('sweet');
    expect(of('potage-pois-verts-maigre')).not.toContain('sweet');
  });

  test('rich: emulsions of fat (mayonnaise, hollandaise); not gazpacho', () => {
    expect(of('mayonnaise')).toContain('rich');
    expect(of('sauce-hollandaise')).toContain('rich');
    expect(of('gazpacho-andaluz')).not.toContain('rich');
  });
});

describe('a dish of the notebook', () => {
  const sauce = (id: string, main: string): ComponentRecord => ({
    id,
    name: id,
    role: 'sauce',
    lines: [
      { ref: { kind: 'ingredient', id: main }, amount: { value: 300, unit: 'g' } },
      { ref: { kind: 'ingredient', id: 'fdc-169230' }, amount: { value: 5, unit: 'g' } },
    ],
    steps: [{ technique: 'simmer' }],
    version,
  });
  const nb: Notebook = {
    components: [sauce('c-tomato', TOMATO), sauce('c-cream', CREAM)],
    facts: {},
    ingredientName: (id) => id,
    ingredientYields: () => undefined,
  };
  const dish = (sauceId: string): DishRecord => ({
    id: 'd',
    name: 'Pasta',
    slots: [
      { role: 'starch', ref: { kind: 'ingredient', id: PASTA }, amount: { value: 100, unit: 'g' } },
      { role: 'sauce', ref: { kind: 'component', id: sauceId }, amount: { value: 150, unit: 'g' } },
    ],
    version,
  });

  test('150 g of tomato sauce on 100 g of pasta: tomato is 147.5 of 250 g, tomatoey by share', () => {
    const facts = factsOfDish(nb, dish('c-tomato'), lookup);
    expect(facts.lines.map((l) => l.g)).toEqual([
      100,
      expect.closeTo(147.54, 2),
      expect.closeTo(2.46, 2),
    ]);
    expect(characterIds(facts)).toEqual(['tomatoey']);
  });

  test('the same dish with the cream sauce is creamy and rich, and no longer tomatoey', () => {
    expect(characterIds(factsOfDish(nb, dish('c-cream'), lookup))).toEqual(['creamy', 'rich']);
  });

  test('a slot without amount gives lines without mass, so presence decides', () => {
    const open: DishRecord = {
      ...dish('c-tomato'),
      slots: [{ role: 'sauce', ref: { kind: 'component', id: 'c-tomato' } }],
    };
    const facts = factsOfDish(nb, open, lookup);
    expect(facts.lines.every((l) => l.g === undefined)).toBe(true);
    expect(characterIds(facts)).toEqual(['tomatoey']);
  });

  test('the techniques are those of the components’ steps', () => {
    expect(factsOfDish(nb, dish('c-tomato'), lookup)).toMatchObject({
      techniques: ['simmer'],
      stepsKnown: true,
    });
  });

  test('heat written as a plain action counts: a dish whose step is "heat" is not uncooked', () => {
    // Before 2026-11-24 the facts carried techniques only, and a step "heat" was invisible.
    const heated: DishRecord = { ...dish('c-tomato'), steps: [{ action: 'heat' }] };
    const plain: Notebook = { ...nb, components: [] };
    const facts = factsOfDish(plain, { ...heated, slots: [] }, lookup);
    expect(facts.actions).toEqual(['heat']);
    expect(characterIds(facts)).not.toContain('uncooked');
    // Control: a step that only serves leaves it uncooked.
    const served = factsOfDish(
      plain,
      { ...heated, slots: [], steps: [{ action: 'serve' }] },
      lookup,
    );
    expect(characterIds(served)).toContain('uncooked');
  });
});

describe('chips', () => {
  test('are named in the content language and carry what the rule rests on', () => {
    expect(characterChips(['tomatoey'], 'de')[0]).toMatchObject({
      id: 'tomatoey',
      label: 'Tomatig',
    });
    expect(characterChips(['tomatoey'], 'en')[0]?.basis).toContain('Judgement');
  });
});

describe('tomato products', () => {
  test('canned tomato sauce or paste counts as tomato: gnocchi with tomato sauce, stracotto', () => {
    expect(of('gnocchi-di-patate')).toContain('tomatoey');
    expect(of('stracotto-di-vitella')).toContain('tomatoey');
    // Control: no tomato, no tomatoey.
    expect(of('risotto-alla-milanese')).not.toContain('tomatoey');
  });
});

// Without meat and fish on a dish of the notebook (review of 2026-11-21): when in doubt the
// answer is "not known", which the filter leaves out, never "meat-free".
describe('without meat and fish, a dish of the notebook', () => {
  const TOMATO_ = 'fdc-170457';
  const BEEF = 'fdc-174036';
  const g = (value: number) => ({ value, unit: 'g' as const });
  const ing = (id: string, grams?: number) => ({
    role: 'main',
    ref: { kind: 'ingredient' as const, id },
    ...(grams === undefined ? {} : { amount: g(grams) }),
  });
  const compSlot = (id: string, grams?: number) => ({
    role: 'main',
    ref: { kind: 'component' as const, id },
    ...(grams === undefined ? {} : { amount: g(grams) }),
  });
  const component = (
    id: string,
    lines: ComponentRecord['lines'],
    yieldG?: number,
  ): ComponentRecord => ({
    id,
    name: id,
    lines,
    version,
    ...(yieldG === undefined ? {} : { yield: { amount: g(yieldG), source: 'user' } }),
  });
  const book = (components: ComponentRecord[]): Notebook => ({
    components,
    facts: {},
    ingredientName: (id) => id,
    ingredientYields: () => undefined,
  });
  const entry = (components: ComponentRecord[], slots: DishRecord['slots']) =>
    entryOfDish(book(components), { id: 'd', name: 'D', slots, version }, lookup, below);
  const ragu = component('ragu', [ing(BEEF, 300)], 300);
  const pastaRagu = component('pasta-ragu', [ing(PASTA, 400), compSlot('ragu')], 700);

  test('lard (filed under Fats and Oils) is not meat-free', () => {
    expect(entry([], [ing(TOMATO_, 200), ing('fdc-171401', 20)]).meatFree).toBe(false);
  });

  test('chicken fat, fish oil, bacon grease: not meat-free; a line of "fat" is the animal-fat group', () => {
    for (const id of ['fdc-173564', 'fdc-173577', 'fdc-172345', 'fdc-group-fat']) {
      expect(entry([], [ing(TOMATO_, 200), ing(id, 20)]).meatFree, id).toBe(false);
    }
  });

  test('a group of which some food is animal fat (shortening) is not known either way', () => {
    expect(
      entry([], [ing(TOMATO_, 200), ing('fdc-group-shortening-household', 20)]).meatFree,
    ).toBeUndefined();
  });

  test('beef in a component nested without amount, the slot with an amount: with meat', () => {
    const e = entry([ragu, pastaRagu], [compSlot('pasta-ragu', 350)]);
    expect(e.characters).toContain('with-meat');
    expect(e.meatFree).toBe(false);
  });

  test('control: the same slot without an amount was with meat before and after', () => {
    expect(entry([ragu, pastaRagu], [compSlot('pasta-ragu')]).meatFree).toBe(false);
  });

  test('a slot whose component is gone, or empty, makes the answer not known', () => {
    expect(entry([], [ing(TOMATO_, 200), compSlot('gone', 100)]).meatFree).toBeUndefined();
    expect(
      entry([component('empty', [])], [ing(TOMATO_, 200), compSlot('empty')]).meatFree,
    ).toBeUndefined();
  });

  test('butter and peas (groups without a category of their own) are known by their foods', () => {
    expect(entry([], [ing('fdc-group-peas', 200), ing('fdc-group-butter', 20)]).meatFree).toBe(
      true,
    );
  });

  test('controls: tomato and olive oil are meat-free; a dish without slots is not known', () => {
    expect(entry([], [ing(TOMATO_, 200), ing('fdc-171413', 20)]).meatFree).toBe(true);
    expect(entry([], []).meatFree).toBeUndefined();
  });

  test('the list covers every catalogue food of an animal body outside meat and fish', () => {
    // Read on 2026-11-21 and, for the sauces and stocks, on 2026-11-23: what USDA files outside
    // its meat, poultry and fish categories. A new entry matching this must be covered by the list
    // (or be added to the plant-based exceptions).
    const animalName =
      /\b(lard|tallow|suet|bacon|grease|gelatin|broth|bouillon|stock|anchov|fish|oyster|worcestershire|meat extract)\b|^fat, (beef|chicken|turkey|goose|duck|pork|mutton)/i;
    // coconut meat (two rows) and the vegetable broth
    const plant = new Set(['fdc-170169', 'fdc-170577', 'fdc-171583']);
    const covered = (id: string) =>
      classesOf(id, lookup, below).some((c) => MEAT_AND_FISH.classes.includes(c));
    const missed = file.ingredients
      .filter((r) => animalName.test(r.name) && !plant.has(r.id) && !covered(r.id))
      .map((r) => `${r.id} ${r.name}`);
    expect(missed).toEqual([]);
  });

  test('the list holds every class of the rules "with meat" and "with fish"', () => {
    const classes = CHARACTER_TABLE.filter((r) => ['with-meat', 'with-fish'].includes(r.id))
      .flatMap((r) => r.when)
      .flatMap((c) => c.ingredients ?? []);
    expect(classes.filter((c) => !MEAT_AND_FISH.classes.includes(c))).toEqual([]);
  });
});

// The rule "uncooked" reads the plain actions of the steps since 2026-11-24: before, heat written
// as an action (cook, heat, melt, preheat, ...) was invisible, and 20 cooked dishes were said to be
// uncooked. Each list is the state of 2026-11-24, read against the steps of each dish.
describe('uncooked on the shipped dishes and frames', () => {
  const uncooked = [...CLASSICS, ...FRAMES]
    .filter(isDishOfItsOwn)
    .map(withoutAlternatives)
    .filter((c) => characterIds(factsOfClassic(c, lookup, below)).includes('uncooked'))
    .map((c) => c.id);
  const ofAny = (id: string): string[] => {
    const classic = [...CLASSICS, ...FRAMES].find((c) => c.id === id);
    if (classic === undefined) throw new Error(id);
    return characterIds(factsOfClassic(withoutAlternatives(classic), lookup, below));
  };

  test('exactly the seven dishes of which no step uses heat', () => {
    expect(uncooked.sort()).toEqual(
      [
        'coban-salatasi',
        'coleslaw',
        'gazpacho-andaluz',
        'horiatiki',
        'kachumber',
        'marinierte-heringe',
        'pai-huanggua',
      ].sort(),
    );
  });

  test('not the 20 cooked dishes that carried it before', () => {
    for (const id of [
      'fanqie-chao-dan',
      'ruehrei',
      'gambas-al-ajillo',
      'crepes',
      'oeufs-brouilles-au-fromage',
      'patates-lemonates',
      'souvlaki-kotopoulo',
      'chapati',
      'impasto-per-pizza',
      'miso-shiru',
      'sake-no-shioyaki',
      'tamagoyaki',
      'tofu-suteki',
      'pollo-deshebrado-en-jitomate',
      'tortillas-de-harina',
      'kofte',
      'buttermilk-pancakes',
      'pizza-margherita',
      'souvlaki-plate',
      'tacos',
    ]) {
      expect(ofAny(id), id).not.toContain('uncooked');
    }
  });

  test('two that lose it by the rule: sesame toasted, a syrup heated', () => {
    expect(ofAny('kyuri-no-sunomono')).not.toContain('uncooked');
    expect(ofAny('achat')).not.toContain('uncooked');
  });

  test('a sauce base: saure Eiersauce is cooked; two cited sauces stay wrong (known)', () => {
    expect(ofAny('saure-eiersauce')).not.toContain('uncooked');
    // Their heat is in a step "whisk over the heat" with neither a heat action nor a technique;
    // the cited recipes' steps are not changed for it (docs/dish-characters.md).
    expect(ofAny('spargelsauce')).toContain('uncooked');
    expect(ofAny('sauce-blanche')).toContain('uncooked');
    // Control: a cold sauce keeps it.
    expect(ofAny('mayonnaise')).toContain('uncooked');
  });
});
