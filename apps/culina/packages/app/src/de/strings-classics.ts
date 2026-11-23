// German texts of the classics; the keys and signatures of ../strings-classics.ts. The content of a
// dish or a technique is in the file of that dish, in two languages.
import type { classicsStrings, pairingStrings } from '../strings-classics';

export const classicsStringsDe: typeof classicsStrings = {
  // The title of the native Linux app's start page
  startTitle: 'Was möchtest du kochen?',
  // Lists
  classicsTitle: 'Klassiker',
  backToCountry: (country: string): string => `Zurück zu ${country}`,
  countries: {
    de: 'Deutschland',
    it: 'Italien',
    fr: 'Frankreich',
    es: 'Spanien',
    gb: 'Großbritannien',
    gr: 'Griechenland',
    tr: 'der Türkei',
    us: 'den Vereinigten Staaten',
    mx: 'Mexiko',
    in: 'Indien',
    th: 'Thailand',
    cn: 'China',
    jp: 'Japan',
  },
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
  ownSource:
    'Ein Rezept dieser App, ohne Quelle: von einem KI-Modell aus allgemeinem Kochwissen geschrieben.',
  ownChecked:
    'Von einer zweiten KI-Sitzung gegengelesen. Niemand aus dem Projekt hat es nachgekocht.',
  ownPersons: (n: number): string => `Geschrieben für ${n} Personen.`,
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

// German texts of the "Goes with" section; the keys and signatures of pairingStrings.
export const pairingStringsDe: typeof pairingStrings = {
  heading: 'Passt dazu',
  intro: 'Zutaten, die mit diesem Gericht mehr Aromastoffe teilen, als sie es sonst tun:',
  rowWith: (names: string): string => `mit ${names}`,
  listLabel: 'Zutaten, die zu diesem Gericht passen',
  none: 'Für die Zutaten dieses Gerichts sticht nichts heraus.',
  unknown: 'Die Aromadaten kennen die Zutaten dieses Gerichts nicht.',
  notLoaded: 'Die Aromadaten konnten nicht geladen werden.',
  loading: 'Aromadaten werden geladen…',
  hint: 'Ein Hinweis, keine Regel: berechnet aus den Aromastoffen, die in jeder Zutat gefunden wurden.',
  limits: 'Die Daten kennen keine Mengen und sagen nichts über süß, sauer, salzig oder bitter.',
  source: 'Daten: FlavorDB (Garg u. a., Nucleic Acids Research 2017), CC BY-NC-SA 3.0.',
  links: 'Welche Zutat hier für welche dort steht, ist eine Einschätzung dieser App.',
  editorEmpty: 'Wähle oben eine erste Zutat oder Komponente; dann steht hier, was dazu passt.',
  editorIntro:
    'Zutaten, die mit dem, was im Gericht ist, mehr Aromastoffe teilen, als sie es sonst tun. Tippe eine an, um sie hinzuzufügen.',
  add: (name: string): string => `${name} zum Gericht hinzufügen`,
  provenHeading: 'Bewährt',
  provenBasis:
    'Was oft zusammen gekocht wird: eine Einschätzung dieser App, von einem KI-Modell geschrieben.',
  provenListLabel: 'Zutaten, die oft mit dem kombiniert werden, was im Gericht ist',
  tapToAdd: 'Tippe eine an, um sie hinzuzufügen.',
  computedHeading: 'Aus den Aromadaten',
};
