// Texts of the hand-over on a dish's page: what the stock lacks for the dish, put on the
// household's shopping list (the sister app, Emptio: "Shopping List"). Plain, no judging word.
// Several names are passed as one text, "; " between them, "" for none.
export const handOverStrings = {
  /** The offer under the ingredients; `n` is at least one. */
  offer: (n: number): string =>
    n === 1
      ? 'The stock lacks 1 ingredient for this.'
      : `The stock lacks ${n} ingredients for this.`,
  /** The offer when this page put some of them on the list already: `listed` of `n`. */
  offerSome: (n: number, listed: number): string =>
    `The stock lacks ${n} ${n === 1 ? 'ingredient' : 'ingredients'} for this; ${listed} of them on the shopping list as needed now.`,
  /** Every ingredient that lacks is on the list from this page: no button then. */
  offerDone: (n: number): string =>
    n === 1
      ? 'The 1 ingredient the stock lacks for this is on the shopping list.'
      : `The ${n} ingredients the stock lacks for this are on the shopping list.`,
  offerButton: 'Put on the shopping list',
  /** The confirmation could not be loaded (offline without the app's cache, a failed request). */
  loadProblem: 'This could not be opened. Try again.',
  /** The app was updated while this page was open: its parts no longer match. */
  updated: 'Cook’s Workbench was updated. Reload it to use the shopping list.',
  heading: 'For the shopping list',
  linesLabel: 'What goes on the shopping list',
  freeHeading: 'Not in the catalogue, no amount',
  /** Before confirming, when the household has more than one space. */
  space: (name: string): string => `Goes on the shopping list of the space “${name}”.`,
  /** A list file that could not be read or sent lately (the list's sync status). */
  notSynced:
    'The shopping list could not be synced lately. What you put on it stays on this device until it can.',
  confirm: (n: number): string => `Put ${n} on the list`,
  cancel: 'Cancel',
  writeRefused: 'The shopping list could not be written. Nothing was put on it.',
  /**
   * After the hand-over: `put` were written (added, or `joined` to an entry already there),
   * `already` were on the list for this dish; `onlyName` when that is all and it is one line.
   */
  summary: (put: number, joined: number, already: number, onlyName?: string): string => {
    if (put === 0)
      return already === 1 && onlyName !== undefined
        ? `${onlyName}: on the shopping list already.`
        : `All ${already} were on the shopping list already.`;
    const into =
      joined === 0
        ? ''
        : joined === put
          ? `, added to ${put === 1 ? 'an entry' : 'entries'} already there`
          : `, ${joined} of them added to ${joined === 1 ? 'an entry' : 'entries'} already there`;
    const there =
      already === 0 ? '' : ` ${already} ${already === 1 ? 'was' : 'were'} on it already.`;
    return `Put ${put} on the shopping list${into}.${there}`;
  },
  /** Lines on the list whose amount is not the one the dish asks now; the list is not changed. */
  differ: (n: number): string =>
    n === 1
      ? 'For 1 of them the list has a different amount from what the dish needs now; the list was not changed.'
      : `For ${n} of them the list has a different amount from what the dish needs now; the list was not changed.`,
  differLabel: 'Amounts on the list and needed now',
  /** One such line: the amount on the list (none: undefined) and the one asked now. */
  difference: (name: string, listed: string | undefined, asked: string): string =>
    `${name}: on the list ${listed ?? 'without an amount'}, needed now ${asked}`,
  open: 'Open the shopping list',
  undo: 'Undo',
  /**
   * Undo, against the list as it is: entries taken off it, entries back as they were before
   * this dish was added to them, entries left because they were ticked or changed since, and
   * entries no longer on the list.
   */
  undone: (removed: string, restored: string, changed: string, gone: string): string => {
    const parts = [
      removed === '' ? '' : `Taken off the list: ${removed}.`,
      restored === '' ? '' : `Back as before, without this dish: ${restored}.`,
      changed === '' ? '' : `Left on the list, ticked or changed since: ${changed}.`,
      gone === '' ? '' : `No longer on the list: ${gone}.`,
    ].filter((p) => p !== '');
    return removed === '' && restored === ''
      ? ['Nothing was taken back.', ...parts].join(' ')
      : parts.join(' ');
  },
  undoRefused: 'The shopping list could not be written. Nothing was taken back.',
};
