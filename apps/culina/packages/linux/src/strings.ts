// The texts only the native app has, English and German; everything about a dish, a step and
// the finder is the web app's own (`strings` of `@culina/app/core`), and the style, the spaces,
// joining and the sync status words are shared with the other native apps (packages/gjs).
import { sharedDe, sharedEn, type SharedTexts } from '@nexumia-de/gjs/texts';

export interface Texts extends SharedTexts {
  appName: string;
  menu: { preferences: string; about: string };
  start: { cookable: string; loading: string };
  dishes: (n: number) => string;
  dish: { portions: string; ingredients: string; method: string; source: string; cook: string };
  cook: {
    done: string;
    stepOf: (n: number, total: number) => string;
    open: string;
  };
  cookable: {
    title: string;
    filters: string;
    lacking: string;
    stock: string;
    nothingAtHand: string;
    nothingAtHandHint: string;
    nothingFits: string;
    sectionNearest: string;
  };
  stock: {
    title: string;
    search: string;
    atHand: (n: number) => string;
    hint: string;
    none: string;
    more: (n: number) => string;
    ticked: (name: string) => string;
    unticked: (name: string) => string;
    undo: string;
  };
  preferencesText: { spacesIntro: string };
  failure: SharedTexts['failure'] & { store: string; content: string };
  about: { comments: string; data: string; dataNotice: string };
}

export const textsEn: Texts = {
  ...sharedEn,
  appName: "Cook's Notebook",
  menu: { preferences: 'Preferences', about: "About Cook's Notebook" },
  start: { cookable: 'What can I cook', loading: 'Loading dishes …' },
  dishes: (n) => (n === 1 ? '1 dish' : `${n} dishes`),
  dish: {
    portions: 'Portions',
    ingredients: 'Ingredients',
    method: 'Method',
    source: 'Source',
    cook: 'Cook step by step',
  },
  cook: {
    done: 'Done cooking',
    stepOf: (n, total) => `Step ${n} of ${total}`,
    open: 'Cooking',
  },
  cookable: {
    title: 'What can I cook',
    filters: 'Filters',
    lacking: 'Show',
    stock: 'What is there',
    nothingAtHand: 'Nothing is there yet',
    nothingAtHandHint:
      'Mark what is in the kitchen, and the classics it allows show up here. The stock is the one of the shown space, shared with Drink Builder and Shopping List.',
    nothingFits: 'No classic fits these choices.',
    sectionNearest: 'The nearest classics',
  },
  stock: {
    title: 'What is there',
    search: 'Search ingredients',
    atHand: (n) => `${n} at hand`,
    hint: 'Search by name and switch on what is in the kitchen. A switch is saved at once.',
    none: 'No ingredient has that name.',
    more: (n) => `${n} more match. Narrow the search.`,
    ticked: (name) => `${name} is there.`,
    unticked: (name) => `${name} is no longer there.`,
    undo: 'Undo',
  },
  preferencesText: {
    spacesIntro:
      'A space is a household, or this device alone. Each space has its own stock. A space is made and shared in the Household app in a browser; this app joins it by its invitation link.',
  },
  failure: {
    ...sharedEn.failure,
    store: 'The data on this device could not be read.',
    content: 'The built-in dish data is damaged.',
  },
  about: {
    comments: 'Classic dishes step by step, and what you can cook. Kept on this device.',
    data: 'Dish and ingredient data',
    dataNotice:
      'Ingredients: USDA FoodData Central (SR Legacy), CC0 1.0 Universal; German names from Wikidata (CC0 1.0) and the project (AGPL-3.0-or-later).\n\nClassic dishes follow the sources they name (author, title, year, link and licence are shown on each dish under "Source"); the method is written in our own words.\n\nTechnique notes are written in our own words from the textbooks they name.',
  },
};

export const textsDe: Texts = {
  ...sharedDe,
  appName: "Cook's Notebook",
  menu: { preferences: 'Einstellungen', about: "Info zu Cook's Notebook" },
  start: { cookable: 'Was kann ich kochen', loading: 'Gerichte werden geladen …' },
  dishes: (n) => (n === 1 ? '1 Gericht' : `${n} Gerichte`),
  dish: {
    portions: 'Portionen',
    ingredients: 'Zutaten',
    method: 'Zubereitung',
    source: 'Quelle',
    cook: 'Schritt für Schritt kochen',
  },
  cook: {
    done: 'Fertig gekocht',
    stepOf: (n, total) => `Schritt ${n} von ${total}`,
    open: 'Kochen',
  },
  cookable: {
    title: 'Was kann ich kochen',
    filters: 'Filter',
    lacking: 'Zeigen',
    stock: 'Vorrat',
    nothingAtHand: 'Noch nichts da',
    nothingAtHandHint:
      'Markiere, was in der Küche ist, und die Klassiker, die das erlaubt, erscheinen hier. Der Vorrat ist der des gezeigten Space, geteilt mit Drink Builder und Einkaufsliste.',
    nothingFits: 'Kein Klassiker passt zu diesen Einstellungen.',
    sectionNearest: 'Die nächsten Klassiker',
  },
  stock: {
    title: 'Vorrat',
    search: 'Zutaten suchen',
    atHand: (n) => `${n} da`,
    hint: 'Nach dem Namen suchen und anschalten, was in der Küche ist. Ein Schalter wird sofort gespeichert.',
    none: 'Keine Zutat hat diesen Namen.',
    more: (n) => `${n} weitere passen. Die Suche eingrenzen.`,
    ticked: (name) => `${name} ist da.`,
    unticked: (name) => `${name} ist nicht mehr da.`,
    undo: 'Rückgängig',
  },
  preferencesText: {
    spacesIntro:
      'Ein Space ist ein Haushalt oder dieses Gerät allein. Jeder Space hat seinen eigenen Vorrat. Ein Space wird in der App Haushalt im Browser angelegt und geteilt; diese App tritt ihm über seinen Einladungslink bei.',
  },
  failure: {
    ...sharedDe.failure,
    store: 'Die Daten auf diesem Gerät konnten nicht gelesen werden.',
    content: 'Die eingebauten Gerichtedaten sind beschädigt.',
  },
  about: {
    comments:
      'Klassische Gerichte Schritt für Schritt, und was du kochen kannst. Auf diesem Gerät gespeichert.',
    data: 'Gerichte- und Zutatendaten',
    dataNotice:
      'Zutaten: USDA FoodData Central (SR Legacy), CC0 1.0 Universal; deutsche Namen aus Wikidata (CC0 1.0) und vom Projekt (AGPL-3.0-or-later).\n\nDie klassischen Gerichte folgen den Quellen, die sie nennen (Autor, Titel, Jahr, Link und Lizenz stehen bei jedem Gericht unter „Quelle“); die Zubereitung ist in eigenen Worten geschrieben.\n\nDie Technikhinweise sind in eigenen Worten nach den Lehrbüchern geschrieben, die sie nennen.',
  },
};
