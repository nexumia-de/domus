// Texts of the classics: the native Linux app's start page, the lists by country, the dish,
// cooking step by step, keeping a dish in the notebook, and the settings for skills and content language. Wording never
// judges a dish. The content of a dish or a technique is in the file of that dish, in two languages.
import type { Country, Course, TechniqueLevel } from '@culina/engine';

export const classicsStrings = {
  // The title of the native Linux app's start page
  startTitle: 'What do you want to cook?',
  // Lists
  classicsTitle: 'Classics',
  backToCountry: (country: string): string => `Back to ${country}`,
  countries: {
    de: 'Germany',
    it: 'Italy',
    fr: 'France',
    es: 'Spain',
    gb: 'Britain',
    gr: 'Greece',
    tr: 'Turkey',
    us: 'the United States',
    mx: 'Mexico',
    in: 'India',
    th: 'Thailand',
    cn: 'China',
    jp: 'Japan',
  } satisfies Record<Country, string>,
  listLabel: (country: string): string => `Classics from ${country}`,
  emptyCountry: 'No dishes from here yet. More are added over time.',
  unknownCountry: 'This country is not in the list.',
  withoutMeat: 'Without meat and fish',
  withMeat: 'With meat or fish',
  course: {
    starter: 'Starter',
    soup: 'Soup',
    main: 'Main course',
    side: 'Side dish',
    dessert: 'Dessert',
    baking: 'Baking',
    sauce: 'Sauce',
    breakfast: 'Breakfast',
    snack: 'Snack',
  } satisfies Record<Course, string>,
  // Dish
  unknownDish: 'This dish is not in the list.',
  originalName: (name: string): string => `Original name: ${name}`,
  sourceHeading: 'Source',
  // The year only once: some titles end with the imprint and its year already.
  sourceLine: (author: string, title: string, year: number): string =>
    `${title}`.includes(`${year}`) ? `${author}, ${title}` : `${author}, ${title}, ${year}`,
  sourcePlace: (place: string): string => `Place: ${place}`,
  sourceLink: 'Open the source',
  sourceLicence: (licence: string): string => `Licence: ${licence}`,
  // A recipe of the project's own (docs/decisions/own-recipes.md): what stands in place of a source.
  ownSource:
    'A recipe of this app, not from a source: written by an AI model from general cooking knowledge.',
  ownChecked: 'Read a second time by another AI session. Nobody of the project has cooked it.',
  ownPersons: (n: number): string => `Written for ${n} persons.`,
  /** Above the choices of a base whose slots have alternatives. */
  fillingHeading: 'Choose what goes in',
  /** A frame: the app's own composition of shipped recipes. */
  frameSource: 'Put together by this app from its own recipes. Each part is a recipe of its own:',
  framePartOwn: (name: string): string => `${name}: a recipe of this app, written by an AI model.`,
  framePartCited: (name: string, author: string, title: string, year: number): string =>
    `${name}: after ${author}, ${title} (${year}).`,
  frameChecked:
    'Each part was read a second time. Nobody read the combination as a whole, and nobody has cooked it.',
  personsStated: (n: number): string => `The source gives its amounts for ${n} persons.`,
  personsSettled: (n: number): string => `The source names no number; we took ${n} persons.`,
  portionsLabel: 'Portions',
  portionsFewer: 'Fewer portions',
  portionsMore: 'More portions',
  portionsUnknown: 'Enter a number of portions above zero to see the amounts.',
  ingredientsHeading: 'Ingredients',
  dishHeading: 'For the dish',
  stepsHeading: 'Method',
  toTaste: 'to taste',
  asNeeded: 'as needed',
  settledMark: 'settled by us',
  amountRange: (a: string, b: string): string => `${a} to ${b}`,
  optional: 'optional',
  remarksHeading: 'Remarks on the source',
  remarkLine: (name: string, original?: string, remark?: string): string =>
    [`${name}:`, original === undefined ? undefined : `“${original}”`, remark]
      .filter((x) => x !== undefined)
      .join(' '),
  remarkDish: (note: string): string => `Dish: ${note}`,
  remarkStep: (n: number, remark: string): string => `Step ${n}: ${remark}`,
  checkMethod: {
    'page-image': 'The numbers were compared with the page image.',
    'second-edition': 'The numbers were compared with a second edition or scan.',
    'second-reader': 'A second person read the same text.',
  },
  cookButton: 'Cook step by step',
  recipeHeading: 'Whole recipe',
  // Cooking
  stepHeading: (n: number, total: number): string => `Step ${n} of ${total}`,
  noSteps: 'This dish has no steps yet. The recipe shows the ingredients.',
  stepFrom: (component: string): string => `From: ${component}`,
  usesHeading: 'You use',
  timeLabel: (text: string): string => `Time: ${text}`,
  temperatureLabel: (text: string): string => `Temperature: ${text}`,
  minutes: (a: string, b?: string): string => (b === undefined ? `${a} min` : `${a} to ${b} min`),
  seconds: (a: string, b?: string): string => (b === undefined ? `${a} s` : `${a} to ${b} s`),
  hours: (a: string, b?: string): string => (b === undefined ? `${a} h` : `${a} to ${b} h`),
  celsius: (a: string, b?: string): string => (b === undefined ? `${a} °C` : `${a} to ${b} °C`),
  fahrenheit: (a: string, b?: string): string => (b === undefined ? `${a} °F` : `${a} to ${b} °F`),
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  stepsLabel: 'Steps',
  // Technique note
  noteHeading: (name: string): string => `Technique: ${name}`,
  noteMore: 'Why, and where it comes from',
  /** A short label in front of the source's title; the level is not a sentence. */
  noteLevel: {
    studied: 'Study',
    textbook: 'Textbook',
    tested: 'Kitchen test',
    authority: 'Authority',
    tradition: 'Tradition',
  } satisfies Record<TechniqueLevel, string>,
  noteSources: 'Sources',
  noteSource: (level: string, title: string, place: string): string =>
    `${level} · ${title}, ${place}`,
  noteSourceBook: (line: string, isbn: string): string => `${line} (ISBN ${isbn})`,
  iKnowThis: 'I know this',
  learnedDone: (name: string): string =>
    `Marked as learned: ${name}. Its note is not shown again. Settings can bring it back.`,
  // Handling note
  handlingHeading: (name: string): string => `Handling: ${name}`,
  // Substitutes
  insteadButton: 'Instead',
  insteadLabel: (name: string): string => `Instead of ${name}`,
  factorQuarter: 'Amount: about a quarter',
  factorThird: 'Amount: about a third',
  factorHalf: 'Amount: about half',
  factorTwoThirds: 'Amount: about two thirds',
  factorThreeQuarters: 'Amount: about three quarters',
  factorSame: 'Amount: the same',
  factorOneAndHalf: 'Amount: about one and a half times',
  factorTwice: 'Amount: about twice',
  factorTimes: (n: string): string => `Amount: about ${n} times`,
  // End of cooking
  doneHeading: 'Done cooking',
  doneText: 'You can keep this dish in your notebook and change it as you like.',
  keepButton: 'Keep in my notebook',
  keepWorking: 'Keeping the dish…',
  keepNote: 'It becomes version 1 of your own dish, with its source named.',
  keepCannot: (names: string): string =>
    `This dish cannot be kept yet: the notebook does not know ${names}. The recipe stays here to cook.`,
  keepProblem: 'The dish could not be kept this time. The recipe is unchanged.',
  backToRecipe: 'Back to the recipe',
  // Settings
  contentLegend: 'Language',
  contentDevice: 'Follow device',
  contentEn: 'English',
  contentDe: 'Deutsch',
  contentNotSaved: 'The choice could not be saved on this device, so it does not apply.',
  skillsHeading: 'Skills you marked as learned',
  skillsNone: 'None yet. Mark a technique with “I know this” while cooking.',
  skillsListLabel: 'Learned skills',
  teachAgain: 'Teach again',
  teachAgainLabel: (name: string): string => `Teach again: ${name}`,
  taughtAgain: (name: string): string => `The note for ${name} is shown again.`,
};

// Texts of the "Goes with" section of a dish: ingredients that share flavour molecules with
// those of the dish. The wording says what was computed and never that a pairing is right.

export const pairingStrings = {
  heading: 'Goes with',
  intro: 'Ingredients that share more flavour molecules with this dish than they usually do:',
  rowWith: (names: string): string => `with ${names}`,
  listLabel: 'Ingredients that go with this dish',
  none: 'Nothing stands out for the ingredients of this dish.',
  unknown: 'The flavour data does not know the ingredients of this dish.',
  notLoaded: 'The flavour data could not be loaded.',
  loading: 'Loading the flavour data…',
  hint: 'A hint, not a rule: it is computed from the flavour molecules found in each ingredient.',
  limits: 'The data has no amounts and says nothing about sweet, sour, salty or bitter.',
  source: 'Data: FlavorDB (Garg et al., Nucleic Acids Research 2017), CC BY-NC-SA 3.0.',
  links: 'Which ingredient here stands for which one there is this app’s judgement.',
  editorEmpty:
    'Choose a first ingredient or component above; what goes with it is then shown here.',
  editorIntro:
    'Ingredients that share more flavour molecules with what is in this dish than they usually do. Tap one to add it.',
  add: (name: string): string => `Add ${name} to the dish`,
  // The project's own table of pairs (data/affinities.json), shown before the computed ones.
  provenHeading: 'Proven together',
  provenBasis: 'What cooks commonly combine: a judgement of this app, written by an AI model.',
  provenListLabel: 'Ingredients commonly combined with what is in this dish',
  tapToAdd: 'Tap one to add it.',
  computedHeading: 'From the flavour data',
};
