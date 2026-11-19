// Texts of Try a Swap (docs/ui-strings.md, "Swap mode"). Like the other
// strings they are constants so a later translation finds them in one place.

export const swapStrings = {
  banner: 'Trying a swap. Nothing is saved.',
  bannerEmpty: 'Trying a swap. Change a line to see the numbers.',
  bannerCount: (n: number) =>
    `Trying a swap. ${n === 1 ? '1 line is' : `${n} lines are`} changed. Nothing is saved.`,
  reset: 'Reset',
  resetAria: 'Reset all lines to the saved drink',
  changed: (was: string) => `Changed, was ${was}`,
  changeLineAria: (amount: string, name: string) => `Change ${name}, ${amount}`,
  sheetTitle: (name: string) => `Change ${name}`,
  closeSheet: 'Close',
  amount: 'Amount',
  smaller: 'Smaller amount',
  larger: 'Larger amount',
  amountHint: 'For example 45 ml, 1½ oz or 2 dashes.',
  understood: (text: string) => `= ${text}`,
  notUnderstood: (text: string, reason: string) =>
    `Not understood: ${text}. ${reason} Try 45 ml, 1½ oz or 2 dashes.`,
  topNote: 'A top has no amount here. Add its volume on the line.',
  ingredient: 'Ingredient',
  now: (name: string) => `Now: ${name}`,
  saved: (name: string) => `Saved: ${name}`,
  selected: 'Selected',
  groups: {
    classRole: 'Same class and role',
    class: 'Same class',
    role: 'Same role',
    near: 'Close in the tree',
  },
  showMore: (n: number) => `Show ${n} more`,
  showFewer: 'Show fewer',
  searchLabel: 'Search all ingredients',
  noMatch: 'No ingredient matches.',
  noOffers: 'Nothing is known to fit this line by role or class. Search all ingredients.',
  roleless: 'This ingredient has no role in the data.',
  resetLine: 'Reset Line',
  done: 'Done',
  toastReset: 'Swap reset',
  toastLineReset: (name: string) => `Reset ${name}`,
  toastDropped: 'Swap dropped',
  figureChange: (before: string, after: string, delta?: string) =>
    `Was ${before} → now ${after}${delta ? ` (${delta})` : ''}`,
  points: 'points',
  noChange: 'no change',
  volumeWas: (ml: number) => `was ${Math.round(ml)} ml`,
  compact: 'Balance now',
  templateNow: (name: string, was: string | undefined) =>
    `Now matches the ${name} template. Before: ${was ?? 'no template'}.`,
  templateNone: (was: string) => `Now matches no template. Before: ${was}.`,
  tryAria: 'Try a swap on this drink',
} as const;
