// Texts of the finder: what can I cook, use up first, start from one ingredient. Wording never
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
  /** The navigation entry; also the name of the group of three views. */
  title: 'Cook',
  viewsLabel: 'Views of Cook',
  tabCook: 'What can I cook',
  tabUseUp: 'Use up first',
  tabStock: 'What is there',
  /** "As of 18 Nov 2026": the day the ranking was made for, `YYYY-MM-DD` in. */
  asOf: (date: string): string => {
    const [y, m, d] = date.split('-').map(Number);
    return `As of ${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
  },
  intro: 'Ranked by what has to be used soonest, then by how many roles it covers.',
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
  lacksHeading: 'Lacks',
  lacksShort: (name: string, have: string, need: string): string =>
    `${name} (${have} there, ${need} needed)`,
  lacksOtherState: (name: string): string => `${name} (there, in another state)`,
  substitution: (substitute: string, asked: string): string =>
    `with ${substitute} in place of ${asked}`,
  amountUnknown: (name: string): string => `${name} is there; how much is not known.`,
  offer: (invite: string, names: string): string => `You could add ${invite}: ${names}`,
  /** The entry's whole link, for a screen reader. */
  openLabel: (name: string): string => `Open ${name}`,
  // The shipped classics, beside the notebook's own dishes
  classicsHeading: 'Classic dishes',
  classicsIntro: 'The shipped classics, judged against what is there by the same rules.',
  classicsFiltersLabel: 'Filters for the classics',
  countryLabel: 'Country',
  countryAny: 'All countries',
  meatLabel: 'Meat and fish',
  meatAny: 'With or without',
  meatFree: 'Without meat and fish',
  classicsListLabel: 'What the stock allows for the classics',
  needsHeading: 'Needs',
  withoutMeatMark: 'without meat and fish',
  /** The lines the catalogue has no ingredient for yet; they are not counted. */
  notInCatalogue: (names: string): string => `Not in the catalogue yet, so not counted: ${names}`,
  classicsEmptyNothingTicked:
    'Nothing is ticked yet, so no classic can be matched to what is there.',
  classicsEmpty: 'No classic fits these choices.',
  classicsNearestHeading: 'The nearest classics',
  classicsNearest: (name: string, needs: string): string => `${name} needs ${needs}`,
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
  withNote: 'Only your own components and dishes that use it or something it can stand in for.',
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
  // Use up first
  useUpIntro: 'What has a use-by date, the nearest first, and what uses it.',
  useUpLabel: 'Stock by use-by date',
  useUpThreshold: (lacking: number): string =>
    lacking === 0 ? 'Counting only what is complete.' : `Counting what lacks at most ${lacking}.`,
  useUpNoDates: 'No item has a use-by date yet. A date can be added on the item.',
  useUpNothing: 'Nothing in your notebook uses it yet.',
  useUpUsedBy: 'Used by',
  useUpOpenItem: (name: string): string => `${name} in stock`,
  problem:
    'The finder could not read the notebook as it is: an ingredient has a parent that is not there or makes a loop.',
  storeProblem: 'The notebook could not be opened, so nothing can be found.',
};
