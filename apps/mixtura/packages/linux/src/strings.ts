// Every text of the native app, English and German. The drinks and the ingredients
// are the built-in data's own names (English). The web app has English texts only, so
// nothing here is shared with it. The style, the spaces, joining, the sync status words and the
// support link are shared with the other native apps (`@nexumia-de/gjs/texts`).
import { sharedDe, sharedEn } from '@nexumia-de/gjs/texts';

export const textsEn = {
  ...sharedEn,
  appName: 'Drink Builder',
  menu: { preferences: 'Preferences', about: 'About Drink Builder' },
  drinks: {
    search: 'Search drinks',
    canMake: 'Show only drinks I can make',
    bottles: 'Bottles at hand',
    all: (n: number) => `All drinks (${n})`,
    makeable: (n: number) => `Can make (${n})`,
    substitute: (n: number) => `With a substitute (${n})`,
    missingOne: (n: number) => `Missing one ingredient (${n})`,
    tagMakeable: 'Can make',
    tagSubstitute: 'With a substitute',
    tagMissingOne: (name: string) => `Missing ${name}`,
    tagMissingMany: (n: number) => `Missing ${n}`,
    showMore: (n: number) => `Show ${n} more`,
    none: 'No drink matches',
    noneHint: 'Try another word.',
    nothingAtHand: 'Nothing at hand yet',
    nothingAtHandHint: 'Mark the bottles you have, and the drinks you can make show up here.',
    openBottles: 'Mark Bottles',
    loading: 'Loading drinks …',
  },
  drink: {
    ingredients: 'Ingredients',
    optional: 'optional',
    or: (names: string) => `or ${names}`,
    top: 'Top',
    details: 'Preparation',
    method: 'Method',
    glass: 'Glass',
    garnish: 'Garnish',
    notes: 'Notes',
    balance: 'Balance',
    balanceHint: 'Worked out from the ingredients; nothing is a verdict.',
    abv: 'Alcohol by volume',
    abvBefore: 'Alcohol by volume, undiluted',
    sugar: 'Sugar per 100 ml',
    acid: 'Acid',
    volume: 'Volume',
    noFigure: 'No figure',
    notCounted: 'Some lines are not counted: they have no measurable volume.',
    estimated: 'Some amounts are estimated from convention units.',
    makeable: 'You can make this drink with what is at hand.',
    substitute: 'You can make this drink if you use a substitute.',
    missingOne: (name: string) => `You are missing one ingredient: ${name}.`,
    missingMany: (n: number) => `You are missing ${n} ingredients.`,
    source: (name: string) => `Source: ${name}`,
  },
  bottles: {
    title: 'Bottles',
    search: 'Search bottles',
    count: (marked: number, all: number) => `${marked} of ${all} at hand`,
    inDrinks: (n: number) => (n === 1 ? 'In 1 drink' : `In ${n} drinks`),
    none: 'No bottle matches',
    other: 'Other',
    more: (n: number) => `${n} more match. Narrow the search.`,
    clear: 'Clear all',
    cleared: (n: number) => `Cleared ${n} marks.`,
    undo: 'Undo',
  },
  preferences: {
    ...sharedEn.preferences,
    units: 'Units',
    unitSystems: { metric: 'Metric', us: 'US', imperial: 'Imperial' },
    spacesIntro:
      'A space is a household, or this device alone. Each space has its own bottles. A space can be created here; it is shared from the Household app in a browser, and this app joins one by its invitation link.',
  },
  failure: {
    ...sharedEn.failure,
    store: 'The data on this device could not be read.',
    seed: 'The built-in drink data is damaged.',
  },
  about: {
    comments: 'Mix drinks from the bottles you have. Kept on this device.',
    data: 'Recipe data',
  },
};

export type Texts = typeof textsEn;

/** "Gin, Lemon juice, Syrup +2": the names joined, the rest counted; the same in every language. */
export function joinNames(names: readonly string[], max = 4): string {
  return names.length <= max
    ? names.join(', ')
    : `${names.slice(0, max).join(', ')} +${names.length - max}`;
}

export const textsDe: Texts = {
  ...sharedDe,
  appName: 'Drink Builder',
  menu: { preferences: 'Einstellungen', about: 'Info zu Drink Builder' },
  drinks: {
    search: 'Drinks suchen',
    canMake: 'Nur Drinks zeigen, die ich machen kann',
    bottles: 'Flaschen im Haus',
    all: (n) => `Alle Drinks (${n})`,
    makeable: (n) => `Machbar (${n})`,
    substitute: (n) => `Mit Ersatz (${n})`,
    missingOne: (n) => `Eine Zutat fehlt (${n})`,
    tagMakeable: 'Machbar',
    tagSubstitute: 'Mit Ersatz',
    tagMissingOne: (name) => `Es fehlt ${name}`,
    tagMissingMany: (n) => `${n} fehlen`,
    showMore: (n) => `${n} weitere zeigen`,
    none: 'Kein Drink passt',
    noneHint: 'Ein anderes Wort versuchen.',
    nothingAtHand: 'Noch nichts im Haus',
    nothingAtHandHint:
      'Die Flaschen markieren, die du hast, und die Drinks, die du machen kannst, erscheinen hier.',
    openBottles: 'Flaschen markieren',
    loading: 'Drinks werden geladen …',
  },
  drink: {
    ingredients: 'Zutaten',
    optional: 'freiwillig',
    or: (names) => `oder ${names}`,
    top: 'Auffüllen',
    details: 'Zubereitung',
    method: 'Methode',
    glass: 'Glas',
    garnish: 'Garnitur',
    notes: 'Notizen',
    balance: 'Balance',
    balanceHint: 'Aus den Zutaten berechnet; nichts davon ist ein Urteil.',
    abv: 'Alkoholgehalt',
    abvBefore: 'Alkoholgehalt, unverdünnt',
    sugar: 'Zucker je 100 ml',
    acid: 'Säure',
    volume: 'Menge',
    noFigure: 'Keine Angabe',
    notCounted: 'Manche Zeilen zählen nicht mit: ihre Menge ist nicht messbar.',
    estimated: 'Manche Mengen sind aus Küchenmaßen geschätzt.',
    makeable: 'Du kannst diesen Drink mit dem machen, was im Haus ist.',
    substitute: 'Du kannst diesen Drink mit einem Ersatz machen.',
    missingOne: (name) => `Es fehlt eine Zutat: ${name}.`,
    missingMany: (n) => `Es fehlen ${n} Zutaten.`,
    source: (name) => `Quelle: ${name}`,
  },
  bottles: {
    title: 'Flaschen',
    search: 'Flaschen suchen',
    count: (marked, all) => `${marked} von ${all} im Haus`,
    inDrinks: (n) => (n === 1 ? 'In 1 Drink' : `In ${n} Drinks`),
    none: 'Keine Flasche passt',
    other: 'Sonstiges',
    more: (n) => `${n} weitere passen. Die Suche eingrenzen.`,
    clear: 'Alle abwählen',
    cleared: (n) => `${n} Markierungen entfernt.`,
    undo: 'Rückgängig',
  },
  preferences: {
    ...sharedDe.preferences,
    units: 'Einheiten',
    unitSystems: { metric: 'Metrisch', us: 'US', imperial: 'Imperial' },
    spacesIntro:
      'Ein Space ist ein Haushalt oder dieses Gerät allein. Jeder Space hat seine eigenen Flaschen. Ein Space kann hier angelegt werden; geteilt wird er in der App Haushalt im Browser, und diese App tritt einem über seinen Einladungslink bei.',
  },
  failure: {
    ...sharedDe.failure,
    store: 'Die Daten auf diesem Gerät konnten nicht gelesen werden.',
    seed: 'Die eingebauten Drinkdaten sind beschädigt.',
  },
  about: {
    comments: 'Drinks aus den Flaschen mixen, die du hast. Auf diesem Gerät gespeichert.',
    data: 'Rezeptdaten',
  },
};
