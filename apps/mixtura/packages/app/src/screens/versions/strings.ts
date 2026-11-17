// Texts of the versions, diff and family screens and of their links on the
// spec screen (docs/ui-strings.md, "Versions and family").

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export const versionStrings = {
  // The spec screen
  riffOf: (name: string) => `Riff of ${name}`,
  parentGone: 'Parent not available',
  versionsLink: (n: number) => `Versions (${n})`,
  familyLink: (riffs: number) =>
    riffs === 0 ? 'Family' : `Family (${plural(riffs, 'riff', 'riffs')})`,
  riff: 'Riff',
  riffAria: (name: string) => `Riff on ${name}: a new drink that starts as a copy`,
  saveAsRiff: 'Save as Riff',
  saveAsRiffAria: 'Make a new drink from the swapped lines, a riff on this one',

  // The versions list
  title: 'Versions',
  titleOf: (name: string) => `${name}: versions`,
  versionLine: (n: number) => `Version ${n}`,
  newest: 'Newest',
  noNote: 'No note',
  choose: (n: number) => `Choose version ${n} to compare`,
  compare: 'Compare',
  compareHint: 'Choose two versions to compare them.',
  compareOne: 'Choose one more version.',
  onlyOne: 'This is the first version.',
  onlyOneEdit: 'Edit',
  statusHistory: 'Status history',
  statusChanged: (status: string, date: string) => `Status set to ${status} on ${date}`,
  summaryNone: 'First version',
  noChangesCap: 'No changes',
  summary: (n: number) => plural(n, 'change', 'changes'),
  notFound: 'This version is not here',
  notFoundText: 'The drink has no such version.',
  openList: 'All Versions',

  // One version
  readOnly: (n: number, newest: number) =>
    n === newest
      ? `Version ${n} is the newest. It cannot be changed here; Edit saves a new version.`
      : `Version ${n} of ${newest}. Earlier versions are read-only.`,
  restore: 'Restore as New Version',
  restoreAria: (n: number) => `Restore version ${n} as a new version`,
  restoredNote: (n: number) => `Restored from v${n}`,
  restored: (name: string, n: number, version: number) =>
    `Restored v${n} of ${name} as version ${version}`,
  restoreFailed: (reason: string) => `Not restored: ${reason}`,
  notePrefix: 'Note',

  // The diff
  diffTitle: (a: number, b: number) => `Version ${a} to ${b}`,
  identical: 'No differences.',
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
  changedIngredient: (from: string, to: string) => `${from} to ${to}`,
  changedAmount: (from: string, to: string) => `${from} to ${to}`,
  field: {
    name: 'Name',
    template: 'Template',
    method: 'Method',
    glass: 'Glass',
    garnish: 'Garnish',
    notes: 'Notes',
  },
  fieldNone: 'none',
  fieldChange: (label: string, from: string, to: string) => `${label}: ${from} to ${to}`,
  lineFlag: { optional: 'optional', required: 'not optional' },
  lineChange: {
    optional: (now: boolean) => (now ? 'now optional' : 'no longer optional'),
    role: 'role changed',
    note: 'note changed',
    substitutes: 'substitutes changed',
  },
  figures: 'Figures',
  figureRow: (name: string, before: string, after: string, delta: string) =>
    delta ? `${name}: ${before} to ${after} (${delta})` : `${name}: ${before} to ${after}`,
  figureUnknown: 'no figure',
  versionOf: (n: number) => `v${n}`,

  // The family
  familyTitle: 'Family',
  familyOf: (name: string) => `${name}: family`,
  parents: 'Made from',
  thisDrink: 'This drink',
  riffs: 'Riffs',
  siblings: 'Other riffs of the same parent',
  noRelatives: 'No related drinks yet.',
  noRiffs: 'No riffs yet.',
  missingParent:
    'The drink this was made from is not available any more. The riff keeps its own content and its note.',
  cycle: (ids: string) => `The family contains a loop (${ids}), so the chain stops there.`,
  noChanges: 'no changes',
  adds: (text: string) => `adds ${text}`,
  removes: (text: string) => `removes ${text}`,
  oneChange: 'one change',
  nChanges: (n: number) => `${n} changes`,
  riffCount: (n: number) => plural(n, 'riff', 'riffs'),
  openDrink: (name: string) => `Open ${name}`,
  compareWithParent: 'Compare with parent',
} as const;
