// German texts of the nutrition section; the keys and signatures of ../strings-nutrition.ts.
import type { nutritionStrings } from '../strings-nutrition';

export const nutritionStringsDe: typeof nutritionStrings = {
  heading: 'Nährwerte pro Portion',
  portionsLine: (portions: number): string =>
    portions === 1
      ? 'Eine Portion eines Gerichts für 1 Portion.'
      : `Eine Portion eines Gerichts für ${portions} Portionen.`,
  tableLabel: 'Werte pro Portion',
  energy: 'Energie',
  protein: 'Eiweiß',
  fat: 'Fett',
  carbohydrate: 'Kohlenhydrate',
  fibre: 'Ballaststoffe',
  salt: 'Salz',
  energyValue: (kcal: string, kJ: string): string => `${kcal} kcal / ${kJ} kJ`,
  gramsValue: (g: string): string => `${g} g`,
  fibreNotShown:
    'Ballaststoffe sind nicht angegeben: Für eine mitgezählte Zutat gibt es keinen Wert.',
  saltNotShown: 'Salz ist nicht angegeben: Für eine mitgezählte Zutat gibt es keinen Natriumwert.',
  coverageAll: (total: number): string =>
    total === 1 ? 'Die 1 Zutat ist gezählt.' : `Alle ${total} Zutaten sind gezählt.`,
  coverageSome: (counted: number, total: number): string =>
    `${counted} von ${total} Zutaten sind gezählt.`,
  notCounted: (list: string): string => `Nicht gezählt: ${list}.`,
  massShare: (percent: string): string =>
    `Die gezählten Zutaten machen ${percent} % des Gewichts aus, soweit es bekannt ist.`,
  tooFew:
    'Nährwerte lassen sich nicht berechnen: Nur wenige Zutaten haben Menge und Nährwertdaten.',
  notShownLeftOut: (list: string): string =>
    `Keine Werte: Nicht zählbar ist ${list}; eine Summe ohne das wäre irreführend.`,
  asUsual: (list: string): string => `Wo das Rezept keine Sorte nennt, zählt die übliche: ${list}.`,
  usualItem: (name: string, usual: string): string => `${name} als ${usual}`,
  seasoningsNote:
    'Nicht in den Werten: Gewürze, Wasser und Zutaten mit höchstens 50 kcal je 100 g; sie stehen unten.',
  limits:
    'Rohwerte für ein gegartes Gericht: ohne aufgenommenes Bratfett, ohne Verluste; alte Quellen nennen grobe Mengen.',
  moreSummary: 'Was nicht gezählt ist und wie gezählt wird',
  reasons: {
    wanted: 'ohne Katalogeintrag',
    'no-amount': 'ohne Menge',
    'cannot-convert': 'Gewicht unbekannt',
    'no-nutrition': 'keine Nährwertdaten',
    optional: 'optional',
    'unknown-component': 'nicht gefunden',
  },
  notCountedItem: (name: string, reason: string): string => `${name} (${reason})`,
  method: 'Mengen wie im Rezept angegeben, roh; ohne Garverlust und ohne Abzug für Nichtessbares.',
  rounding: 'Gerundet nach 21 CFR 101.9(c), der US-Regel für Nährwertangaben.',
  source: 'Nährstoffe pro 100 g: USDA FoodData Central, SR Legacy (gemeinfrei).',
  notALabel:
    'Eine Hilfe für die eigene Küche, keine Nährwertkennzeichnung für den Verkauf von Lebensmitteln.',
};
