// German texts of the classics; the keys and signatures of ../strings-classics.ts. The content of a
// dish or a technique is in the file of that dish, in two languages.
import type { classicsStrings } from '../strings-classics';

export const classicsStringsDe: typeof classicsStrings = {
  // Start screen
  startTitle: 'Was möchtest du kochen?',
  startIntro:
    'Wähle einen Klassiker und koch ihn Schritt für Schritt, oder nimm eines deiner Werkzeuge.',
  classicsHeading: 'Klassiker nach Land',
  countryLink: (country: string, count: number): string =>
    `${country}, ${count === 1 ? '1 Gericht' : `${count} Gerichte`}`,
  toolsHeading: 'Deine Werkzeuge',
  toolsHint:
    'Verhältnisse, deine Komponenten und Gerichte und was du aus dem Vorrat kochen kannst.',
  tools: {
    ratios: 'Verhältnisse',
    components: 'Komponenten',
    dishes: 'Gerichte',
    cook: 'Was kann ich kochen',
    stock: 'Vorrat',
  },
  // Lists
  classicsTitle: 'Klassiker',
  backToStart: 'Zurück zum Start',
  backToCountry: (country: string): string => `Zurück zu ${country}`,
  countries: { de: 'Deutschland', it: 'Italien', fr: 'Frankreich', es: 'Spanien' },
  listLabel: (country: string): string => `Klassiker aus ${country}`,
  emptyCountry: 'Von hier gibt es noch keine Gerichte. Es kommen nach und nach mehr dazu.',
  unknownCountry: 'Dieses Land steht nicht in der Liste.',
  withoutMeat: 'Ohne Fleisch und Fisch',
  withMeat: 'Mit Fleisch oder Fisch',
  course: {
    starter: 'Vorspeise',
    soup: 'Suppe',
    main: 'Hauptgericht',
    side: 'Beilage',
    dessert: 'Nachspeise',
    baking: 'Gebäck',
    sauce: 'Soße',
    breakfast: 'Frühstück',
    snack: 'Snack',
  },
  // Dish
  unknownDish: 'Dieses Gericht steht nicht in der Liste.',
  originalName: (name: string): string => `Originalname: ${name}`,
  sourceHeading: 'Quelle',
  // The year only once: some titles end with the imprint and its year already.
  sourceLine: (author: string, title: string, year: number): string =>
    `${title}`.includes(`${year}`) ? `${author}, ${title}` : `${author}, ${title}, ${year}`,
  sourcePlace: (place: string): string => `Fundstelle: ${place}`,
  sourceLink: 'Quelle öffnen',
  sourceLicence: (licence: string): string => `Lizenz: ${licence}`,
  personsStated: (n: number): string => `Die Quelle gibt ihre Mengen für ${n} Personen an.`,
  personsSettled: (n: number): string => `Die Quelle nennt keine Zahl; angenommen: ${n} Personen.`,
  portionsLabel: 'Portionen',
  portionsFewer: 'Weniger Portionen',
  portionsMore: 'Mehr Portionen',
  portionsUnknown: 'Gib eine Portionenzahl über null ein, um die Mengen zu sehen.',
  ingredientsHeading: 'Zutaten',
  dishHeading: 'Für das Gericht',
  stepsHeading: 'Zubereitung',
  toTaste: 'nach Geschmack',
  asNeeded: 'nach Bedarf',
  settledMark: 'von uns festgelegt',
  amountRange: (a: string, b: string): string => `${a} bis ${b}`,
  optional: 'optional',
  remarksHeading: 'Anmerkungen zur Quelle',
  remarkLine: (name: string, original?: string, remark?: string): string =>
    [`${name}:`, original === undefined ? undefined : `„${original}“`, remark]
      .filter((x) => x !== undefined)
      .join(' '),
  remarkDish: (note: string): string => `Gericht: ${note}`,
  remarkStep: (n: number, remark: string): string => `Schritt ${n}: ${remark}`,
  checkMethod: {
    'page-image': 'Die Zahlen wurden mit dem Seitenbild verglichen.',
    'second-edition': 'Die Zahlen wurden mit einer zweiten Ausgabe oder einem Scan verglichen.',
    'second-reader': 'Eine zweite Person hat denselben Text gelesen.',
  },
  cookButton: 'Schritt für Schritt kochen',
  recipeHeading: 'Ganzes Rezept',
  // Cooking
  stepHeading: (n: number, total: number): string => `Schritt ${n} von ${total}`,
  noSteps: 'Dieses Gericht hat noch keine Schritte. Das Rezept zeigt die Zutaten.',
  stepFrom: (component: string): string => `Aus: ${component}`,
  usesHeading: 'Du brauchst',
  timeLabel: (text: string): string => `Zeit: ${text}`,
  temperatureLabel: (text: string): string => `Temperatur: ${text}`,
  minutes: (a: string, b?: string): string =>
    b === undefined ? `${a} Min.` : `${a} bis ${b} Min.`,
  seconds: (a: string, b?: string): string =>
    b === undefined ? `${a} Sek.` : `${a} bis ${b} Sek.`,
  hours: (a: string, b?: string): string => (b === undefined ? `${a} Std.` : `${a} bis ${b} Std.`),
  celsius: (a: string, b?: string): string => (b === undefined ? `${a} °C` : `${a} bis ${b} °C`),
  fahrenheit: (a: string, b?: string): string => (b === undefined ? `${a} °F` : `${a} bis ${b} °F`),
  back: 'Zurück',
  next: 'Weiter',
  finish: 'Fertig',
  stepsLabel: 'Schritte',
  // Technique note
  noteHeading: (name: string): string => `Technik: ${name}`,
  noteMore: 'Warum, und woher es kommt',
  noteLevel: {
    studied: 'Studie',
    textbook: 'Lehrbuch',
    tested: 'Küchenversuch',
    authority: 'Behörde',
    tradition: 'Überlieferung',
  },
  noteSources: 'Quellen',
  noteSource: (level: string, title: string, place: string): string =>
    `${level} · ${title}, ${place}`,
  noteSourceBook: (line: string, isbn: string): string => `${line} (ISBN ${isbn})`,
  iKnowThis: 'Das kenne ich',
  learnedDone: (name: string): string =>
    `Als gelernt markiert: ${name}. Der Hinweis erscheint nicht mehr. In den Einstellungen kommt er zurück.`,
  // Handling note
  handlingHeading: (name: string): string => `Tipp zu ${name}`,
  // Substitutes
  insteadButton: 'Ersatz',
  insteadLabel: (name: string): string => `Statt ${name}`,
  factorQuarter: 'Menge: etwa ein Viertel',
  factorThird: 'Menge: etwa ein Drittel',
  factorHalf: 'Menge: etwa die Hälfte',
  factorTwoThirds: 'Menge: etwa zwei Drittel',
  factorThreeQuarters: 'Menge: etwa drei Viertel',
  factorSame: 'Menge: gleich viel',
  factorOneAndHalf: 'Menge: etwa anderthalbmal so viel',
  factorTwice: 'Menge: etwa doppelt so viel',
  factorTimes: (n: string): string => `Menge: etwa ${n}-mal so viel`,
  // End of cooking
  doneHeading: 'Fertig gekocht',
  doneText: 'Du kannst das Gericht in deinem Notizbuch behalten und nach Belieben ändern.',
  keepButton: 'In mein Notizbuch übernehmen',
  keepWorking: 'Gericht wird übernommen…',
  keepNote: 'Es wird Version 1 deines eigenen Gerichts, mit genannter Quelle.',
  keepCannot: (names: string): string =>
    `Dieses Gericht lässt sich noch nicht übernehmen: Das Notizbuch kennt ${names} nicht. Das Rezept bleibt hier zum Kochen.`,
  keepProblem: 'Das Gericht ließ sich diesmal nicht übernehmen. Das Rezept ist unverändert.',
  backToRecipe: 'Zurück zum Rezept',
  // Settings
  contentLegend: 'Sprache',
  contentDevice: 'Wie das Gerät',
  contentEn: 'English',
  contentDe: 'Deutsch',
  contentNotSaved:
    'Die Auswahl ließ sich auf diesem Gerät nicht speichern, deshalb gilt sie nicht.',
  skillsHeading: 'Techniken, die du als gelernt markiert hast',
  skillsNone: 'Noch keine. Markiere beim Kochen eine Technik mit „Das kenne ich“.',
  skillsListLabel: 'Gelernte Techniken',
  teachAgain: 'Wieder zeigen',
  teachAgainLabel: (name: string): string => `Wieder zeigen: ${name}`,
  taughtAgain: (name: string): string => `Der Hinweis zu ${name} wird wieder gezeigt.`,
};
