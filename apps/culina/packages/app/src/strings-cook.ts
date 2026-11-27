// Texts of Cook and the finder: the one list's switch and order, start from one ingredient. Wording never
// judges: a recipe lacks a line, it is not wrong; an item with days left is information.
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const cookStrings = {
  /** The navigation entry and the h1 of the one list (docs/decisions/cook-screen.md). */
  title: 'Cook',
  /** The switch of the one list: only the dishes the stock covers. */
  haveLabel: 'Only with what I have',
  /** The order of the one list. */
  orderLabel: 'Order',
  orderName: 'By name',
  /** The order of the one list that puts the dishes using the nearest use-by first. */
  tabUseUp: 'Use up first',
  /** The order of the one list that puts the own dishes cooked longest ago first. */
  orderNotCooked: 'Not cooked for long',
  /** On the row of an own dish with a kept day: "cooked 3 Nov 2026" (the date in the app's form). */
  rowCooked: (date: string): string => `cooked ${date}`,
  /** Above the list in the order "Not cooked for long" while no dish has a day. */
  notCookedNone: 'None of your dishes is marked as cooked yet, so the list is by name.',
  /** The order of the one list that puts the favourites first, own and shipped. */
  orderFavourites: 'Favourites first',
  /** On the row of a favourite. */
  rowFavourite: 'Favourite',
  /** Above the list in the order "Favourites first" while no dish is a favourite. */
  favouritesNone: 'No dish is marked as a favourite yet, so the list is by name.',
  /** The way from Cook to the stock screen, and that screen's title. */
  tabStock: 'What is there',
  backToCook: 'Back to Cook',
  /** "As of 18 Nov 2026": the day the ranking was made for, `YYYY-MM-DD` in. */
  asOf: (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    return `As of ${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
  },
  // Filters
  filtersLabel: 'Filters',
  roleLabel: 'Covers the role',
  roleAny: 'Any role',
  lackingLabel: 'Show',
  lackingOptions: {
    0: 'Complete only',
    1: 'Lacking at most 1',
    2: 'Lacking at most 2',
    3: 'Lacking at most 3',
  },
  // Entries
  listLabel: 'What the stock allows',
  /** The two groups of the list: dishes of both origins, then components and ratio cards. */
  dishesHeading: 'Dishes',
  partsHeading: 'Components and ratios',
  partsListLabel: 'Components and ratios the stock allows',
  /** The quiet origin word of an entry, shown where both origins are in the list. */
  originWord: { own: 'mine', shipped: 'shipped' },
  complete: 'complete',
  lacks: (n: number): string => `lacks ${n}`,
  kind: { component: 'component', dish: 'dish', template: 'ratio', classic: 'classic' },
  daysLeft: (days: number): string => (days === 1 ? '1 day left' : `${days} days left`),
  useByToday: 'use by today',
  pastUseBy: 'past use by',
  reasonUses: (item: string, daysLeft: number): string =>
    daysLeft < 0
      ? `uses the ${item}, past use by`
      : daysLeft === 0
        ? `uses the ${item}, use by today`
        : `uses the ${item} with ${daysLeft === 1 ? '1 day' : `${daysLeft} days`} left`,
  reasonNoDate: 'nothing it uses has a use-by date',
  reasonRoles: (roles: string): string => `covers ${roles}`,
  reasonNoRoles: 'no roles recorded',
  /** A role word inside a sentence: lower case in English ("covers fat, flour"). */
  roleInSentence: (label: string): string => `${label}`.toLowerCase(),
  lacksHeading: 'Lacks',
  lacksShort: (name: string, have: string, need: string): string =>
    `${name} (${have} there, ${need} needed)`,
  lacksOtherState: (name: string): string => `${name} (there, in another state)`,
  substitution: (substitute: string, asked: string): string =>
    `with ${substitute} in place of ${asked}`,
  /** A group in stock covers a line that names a member of it. */
  throughGroup: (inStock: string, asked: string): string =>
    `${inStock} in stock counts for ${asked}`,
  /** A whole in stock covers a line that names a part of it. */
  throughPart: (whole: string, part: string): string => `${part} from the ${whole} in stock`,
  amountUnknown: (name: string): string => `${name} is there; how much is not known.`,
  offer: (invite: string, names: string): string => `You could add ${invite}: ${names}`,
  /** The entry's whole link, for a screen reader. */
  openLabel: (name: string): string => `Open ${name}`,
  // "Needs", read by the native Linux app for what a shipped dish lacks.
  needsHeading: 'Needs',
  /** The lines the catalogue has no ingredient for yet; they are not counted. */
  notInCatalogue: (names: string): string => `Not in the catalogue yet, so not counted: ${names}`,
  // Start from one ingredient
  startSummary: 'Start from one ingredient',
  startHint: 'Own components and dishes that use it, or something it can stand in for.',
  startStock: 'From what is there',
  startSearchLabel: 'Search your ingredients',
  startFound: 'Ingredients found',
  startNone: 'No ingredient of yours has that name.',
  startNoStock: 'Nothing ticked yet, so search by name.',
  startFoundThrough: (name: string): string => `also called ${name}`,
  withHeading: (name: string): string => `What uses ${name}`,
  withNote:
    'Only your own components and dishes that use it or something it can stand in for, whatever is chosen on the dish filter.',
  withClear: 'Show everything',
  withUnknown: 'That ingredient is no longer in your notebook.',
  // Empty states
  emptyNothingTicked: 'Nothing is ticked yet, so there is nothing to cook from.',
  tickLink: 'Tick what is there',
  emptyNoNotebook: 'Your notebook has no components or dishes yet.',
  addComponent: 'Add a component',
  importLink: 'Import a recipe',
  emptyNoMatch: 'Nothing matches these choices.',
  emptyNothingRelated: 'Nothing in your notebook uses what is ticked yet.',
  nearestHeading: 'The nearest ones',
  nearest: (name: string, lacks: string): string => `${name} lacks ${lacks}`,
  // Use up first, as the order of the one list
  useUpNoDates: 'No item has a use-by date yet. A date can be added on the item.',
  problem:
    'The finder could not read the notebook as it is: an ingredient has a parent that is not there or makes a loop.',
  storeProblem: 'The notebook could not be opened, so nothing can be found.',
};
