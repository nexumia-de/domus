// German texts of the finder; the keys and signatures of ../strings-cook.ts. Wording never
// judges: a recipe needs something more, it is never wrong.
import type { cookStrings } from '../strings-cook';

const MONTHS = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sept.',
  'Okt.',
  'Nov.',
  'Dez.',
] as const;

export const cookStringsDe: typeof cookStrings = {
  title: 'Kochen',
  viewsLabel: 'Ansichten von Kochen',
  sectionsLabel: 'Teile von Kochen',
  sectionStock: 'Mit meinem Vorrat',
  sectionClassics: 'Klassiker',
  tabCook: 'Was kann ich kochen',
  tabUseUp: 'Zuerst verbrauchen',
  tabStock: 'Vorrat',
  asOf: (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    return `Stand ${d}. ${MONTHS[(m ?? 1) - 1]} ${y}`;
  },
  intro:
    'Deine und mitgelieferte Gerichte in einer Liste: zuerst, was bald verbraucht werden sollte, dann nach abgedeckten Rollen.',
  // Filters
  filtersLabel: 'Filter',
  roleLabel: 'Deckt die Rolle ab',
  roleAny: 'Jede Rolle',
  lackingLabel: 'Anzeigen',
  lackingOptions: {
    0: 'Nur vollständige',
    1: 'Bis zu 1 Zutat dazu',
    2: 'Bis zu 2 Zutaten dazu',
    3: 'Bis zu 3 Zutaten dazu',
  },
  // Entries
  listLabel: 'Was der Vorrat hergibt',
  dishesHeading: 'Gerichte',
  partsHeading: 'Komponenten und Verhältnisse',
  partsListLabel: 'Komponenten und Verhältnisse, die der Vorrat hergibt',
  partsHidden:
    'Komponenten und Verhältniskarten bleiben weg, solange ein Filter für Gerichte gewählt ist.',
  originWord: { own: 'eigenes', shipped: 'mitgeliefert' },
  complete: 'vollständig',
  lacks: (n: number): string => `noch ${n} nötig`,
  kind: { component: 'Komponente', dish: 'Gericht', template: 'Verhältnis', classic: 'Klassiker' },
  daysLeft: (days: number): string => (days === 1 ? 'noch 1 Tag' : `noch ${days} Tage`),
  useByToday: 'heute verbrauchen',
  pastUseBy: 'Datum überschritten',
  reasonUses: (item: string, daysLeft: number): string =>
    daysLeft < 0
      ? `nutzt ${item}, Datum überschritten`
      : daysLeft === 0
        ? `nutzt ${item}, heute verbrauchen`
        : `nutzt ${item}, noch ${daysLeft === 1 ? '1 Tag' : `${daysLeft} Tage`}`,
  reasonNoDate: 'ohne Verbrauchsdatum',
  reasonRoles: (roles: string): string => `Rollen: ${roles}`,
  reasonNoRoles: 'keine Rollen erfasst',
  lacksHeading: 'Noch nötig',
  lacksShort: (name: string, have: string, need: string): string =>
    `${name} (${have} da, ${need} nötig)`,
  lacksOtherState: (name: string): string => `${name} (da, in anderem Zustand)`,
  substitution: (substitute: string, asked: string): string => `mit ${substitute} statt ${asked}`,
  amountUnknown: (name: string): string => `${name} ist da; wie viel, ist nicht bekannt.`,
  offer: (invite: string, names: string): string => `Du könntest ${invite} ergänzen: ${names}`,
  openLabel: (name: string): string => `${name} öffnen`,
  // The shipped classics (the native Linux app)
  countryLabel: 'Land',
  countryAny: 'Alle Länder',
  meatLabel: 'Fleisch und Fisch',
  meatAny: 'Mit oder ohne',
  meatFree: 'Ohne Fleisch und Fisch',
  classicsListLabel: 'Was der Vorrat für die Klassiker hergibt',
  needsHeading: 'Braucht',
  notInCatalogue: (names: string): string =>
    `Noch nicht im Katalog, deshalb nicht gezählt: ${names}`,
  // Start from one ingredient
  startSummary: 'Von einer Zutat ausgehen',
  startHint:
    'Eigene Komponenten und Gerichte, die sie verwenden, oder etwas, wofür sie einspringen kann.',
  startStock: 'Aus dem Vorrat',
  startSearchLabel: 'In deinen Zutaten suchen',
  startFound: 'Gefundene Zutaten',
  startNone: 'Keine deiner Zutaten hat diesen Namen.',
  startNoStock: 'Noch nichts angehakt, such also nach dem Namen.',
  startFoundThrough: (name: string): string => `auch ${name} genannt`,
  withHeading: (name: string): string => `Was ${name} verwendet`,
  withNote:
    'Nur eigene Komponenten und Gerichte, die sie oder einen Ersatz dafür verwenden; der Filter für Gerichte gilt für die Gerichte.',
  withClear: 'Alles zeigen',
  withUnknown: 'Diese Zutat ist nicht mehr in deinem Notizbuch.',
  // Empty states
  emptyNothingTicked: 'Noch nichts angehakt, daher gibt es nichts zum Kochen.',
  tickLink: 'Vorrat anhaken',
  emptyNoNotebook: 'Dein Notizbuch hat noch keine Komponenten oder Gerichte.',
  addComponent: 'Komponente anlegen',
  importLink: 'Rezept importieren',
  emptyNoMatch: 'Nichts passt zu dieser Auswahl.',
  emptyNothingRelated: 'Nichts in deinem Notizbuch verwendet bisher, was angehakt ist.',
  nearestHeading: 'Die nächsten',
  nearest: (name: string, lacks: string): string => `${name} braucht noch ${lacks}`,
  // Use up first
  useUpIntro: 'Was ein Verbrauchsdatum hat, das nächste zuerst, und was es verwendet.',
  useUpLabel: 'Vorrat nach Verbrauchsdatum',
  useUpThreshold: (lacking: number): string =>
    lacking === 0
      ? 'Gezählt wird nur, was vollständig ist.'
      : `Gezählt wird, was bis zu ${lacking} weitere Zutaten braucht.`,
  useUpNoDates:
    'Noch kein Eintrag hat ein Verbrauchsdatum. Das Datum lässt sich am Eintrag ergänzen.',
  useUpNothing: 'Nichts in der Liste verwendet es bisher.',
  useUpFiltered:
    'Gezählt innerhalb des Filters für Gerichte, der bei „Was kann ich kochen“ gewählt ist.',
  useUpUsedBy: 'Verwendet von',
  useUpOpenItem: (name: string): string => `${name} im Vorrat`,
  problem:
    'Die Suche konnte das Notizbuch nicht lesen: Eine Zutat hat eine übergeordnete Zutat, die nicht da ist oder eine Schleife bildet.',
  storeProblem: 'Das Notizbuch ließ sich nicht öffnen, deshalb kann nichts gefunden werden.',
};
