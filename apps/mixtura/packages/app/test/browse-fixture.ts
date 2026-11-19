// Data for the browse tests: a small hand-made drink list with a known
// answer for every filter, and the real seed as the browse model.
import { ROOT_TEMPLATES } from '@mixtura/engine';
import { assembleSeed } from '../seed-assemble.mjs';
import { buildModel, type BrowseModel, type ModelInput } from '../src/screens/browse/model';
import type { Ingredient, SpecData, Template } from '../src/screens/browse/types';
import { parseSeed } from '../src/store';

const ing = (id: string, name: string, extra: Partial<Ingredient> = {}): Ingredient => ({
  id,
  name,
  level: 'product',
  ...extra,
});

export const fixtureIngredients: Ingredient[] = [
  ing('spirits', 'Spirits', { level: 'category', role: 'base', abv: 40, sugar: 0, acid: 0 }),
  ing('gin', 'Gin', { level: 'type', parentId: 'spirits' }),
  ing('london-gin', 'London Dry Gin', { parentId: 'gin' }),
  ing('rum', 'Rum', { level: 'type', parentId: 'spirits' }),
  ing('cognac', 'Cognac', { parentId: 'spirits' }),
  ing('juices', 'Juices', { level: 'category', role: 'sour', abv: 0, sugar: 1.5, acid: 6 }),
  ing('lime', 'Lime Juice', { parentId: 'juices' }),
  ing('syrups', 'Syrups', { level: 'category', role: 'sweet', abv: 0, sugar: 61, acid: 0 }),
  ing('simple', 'Simple Syrup', { parentId: 'syrups' }),
  ing('wines', 'Fortified wine', {
    level: 'category',
    role: 'modifier',
    abv: 16,
    sugar: 3,
    acid: 0,
  }),
  ing('vermouth', 'Dry Vermouth', { parentId: 'wines' }),
  ing('creme', 'Crème de Cacao', {
    level: 'category',
    role: 'modifier',
    abv: 20,
    sugar: 30,
    acid: 0,
  }),
  ing('soda', 'Soda', { level: 'category', role: 'lengthener', abv: 0, sugar: 0, acid: 0 }),
];

let n = 0;
export const fixtureSpec = (
  name: string,
  lines: [string, number][],
  extra: Partial<SpecData> = {},
): SpecData => {
  n += 1;
  return {
    id: `s${n}`,
    lineageId: `s${n}`,
    version: 1,
    name,
    status: 'draft',
    lines: lines.map(([ingredientId, amount]) => ({ ingredientId, amount, unit: 'ml' })),
    ...extra,
  };
};

export const fixtureSpecs: SpecData[] = [
  fixtureSpec(
    'Daiquiri',
    [
      ['rum', 60],
      ['lime', 22.5],
      ['simple', 22.5],
    ],
    { method: 'shake', templateId: 'daiquiri', tags: ['Classic'] },
  ),
  fixtureSpec(
    'Gimlet',
    [
      ['london-gin', 60],
      ['lime', 22.5],
      ['simple', 22.5],
    ],
    { method: 'shake', templateId: 'daiquiri' },
  ),
  fixtureSpec(
    'Martini',
    [
      ['gin', 60],
      ['vermouth', 30],
    ],
    { method: 'stir', templateId: 'martini' },
  ),
  fixtureSpec(
    'Crème Brûlée Flip',
    [
      ['cognac', 60],
      ['creme', 15],
    ],
    { method: 'shake' },
  ),
  fixtureSpec(
    'Gin and Soda',
    [
      ['gin', 60],
      ['soda', 150],
    ],
    { method: 'build' },
  ),
  fixtureSpec('No Method Drink', [
    ['rum', 60],
    ['lime', 30],
  ]),
  fixtureSpec('Retired One', [['rum', 60]], { status: 'retired', method: 'stir' }),
];
// A second, newer version of the Gimlet: the list shows only this one.
export const gimletV2: SpecData = {
  ...(fixtureSpecs[1] as SpecData),
  id: 'gimlet-v2',
  version: 2,
  name: 'Gimlet (less syrup)',
  lines: [
    { ingredientId: 'london-gin', amount: 60, unit: 'ml' },
    { ingredientId: 'lime', amount: 22.5, unit: 'ml' },
    { ingredientId: 'simple', amount: 15, unit: 'ml' },
  ],
};

export const vocabulary = {
  methods: [
    { id: 'shake', name: 'Shake' },
    { id: 'stir', name: 'Stir' },
    { id: 'build', name: 'Build' },
  ],
  glasses: [{ id: 'coupe', name: 'Coupe' }],
};

export function fixtureInput(extraSpecs: SpecData[] = [gimletV2]): ModelInput {
  return {
    ingredients: fixtureIngredients,
    templates: ROOT_TEMPLATES.map((value) => ({
      value: value as Template,
      origin: 'seed' as const,
    })),
    specs: [...fixtureSpecs, ...extraSpecs].map((value) => ({ value, origin: 'seed' as const })),
    vocabulary,
    seedVersion: 'fixture',
  };
}

export function fixtureModel(): BrowseModel {
  const built = buildModel(fixtureInput());
  if (!built.ok) throw new Error(built.reason);
  return built.model;
}

/** The seed the build ships, as the browse model. */
export function seedModel(): BrowseModel {
  const seed = parseSeed(JSON.parse(JSON.stringify(assembleSeed())));
  const built = buildModel({
    ingredients: seed.ingredients,
    templates: seed.templates.map((value) => ({
      value: value as unknown as Template,
      origin: 'seed' as const,
    })),
    specs: seed.specs.map((value) => ({
      value: value as unknown as SpecData,
      origin: 'seed' as const,
    })),
    vocabulary: seed.vocabulary,
    attribution: seed.attribution,
    seedVersion: seed.seedVersion,
  });
  if (!built.ok) throw new Error(built.reason);
  return built.model;
}
