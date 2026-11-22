// The example set in German, for "Add example data" when the app speaks German: the texts that are
// stored with a record (names, notes, the source of a made-up figure). Ingredient names are in
// `ingredients.ts` (`names.de`). The ids stay as they are.
import type { Lang } from '@culina/engine';
import type { ComponentRecord, DishRecord, IngredientRecord } from '../records';

const EXAMPLE_FIGURE = 'Beispieldaten, kein gemessener Wert';
const EXAMPLE_OUTPUT = 'Beispieldaten, kein gewogener Ertrag';

const COMPONENT_NAMES: Record<string, string> = {
  'example-soft-vegetable-base': 'Beispiel: Weiche Gemüsebasis',
  'example-vegetable-stock': 'Beispiel: Gemüsebrühe',
  'example-pan-sauce': 'Beispiel: Pfannensoße mit Brühe als Grundlage',
  'example-flat-dough': 'Beispiel: Fladenteig',
  'example-herb-oil': 'Beispiel: Kräuteröl',
  'example-herb-oil-2': 'Beispiel: Kräuteröl',
};

const DISH_NAMES: Record<string, string> = {
  'example-flat-dough-with-sauce': 'Beispiel: Fladen mit Pfannensoße',
  'example-vegetable-plate': 'Beispiel: Gemüseteller mit Kräuteröl',
};

export const ingredientsIn = (
  records: readonly IngredientRecord[],
  lang: Lang,
): IngredientRecord[] =>
  lang === 'en'
    ? [...records]
    : records.map((r) => ({
        ...r,
        note: 'Beispielzutat',
        ...(r.yields === undefined
          ? {}
          : { yields: r.yields.map((y) => ({ ...y, source: EXAMPLE_FIGURE })) }),
      }));

export const componentsIn = (records: readonly ComponentRecord[], lang: Lang): ComponentRecord[] =>
  lang === 'en'
    ? [...records]
    : records.map((r) => ({
        ...r,
        name: COMPONENT_NAMES[r.id] ?? r.name,
        ...(r.yield === undefined ? {} : { yield: { ...r.yield, source: EXAMPLE_OUTPUT } }),
        ...(r.method === undefined ? {} : { method: ['Beispieltext, keine Zubereitung.'] }),
        version: {
          ...r.version,
          ...(r.version.change === undefined
            ? {}
            : { change: 'Beispiel: ein Zubereitungstext wurde ergänzt' }),
          ...(r.version.reason === undefined ? {} : { reason: 'Beispieldaten für den Verlauf' }),
        },
      }));

export const dishesIn = (records: readonly DishRecord[], lang: Lang): DishRecord[] =>
  lang === 'en'
    ? [...records]
    : records.map((r) => ({
        ...r,
        name: DISH_NAMES[r.id] ?? r.name,
        ...(r.note === undefined ? {} : { note: 'Beispielgericht zur Vorführung, kein Rezept.' }),
      }));
