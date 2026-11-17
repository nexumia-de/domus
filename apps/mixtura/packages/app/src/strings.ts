// Fixed texts of the shell, from docs/ui-strings.md. Screens add their
// own strings next to their code; every text is a constant so a later
// translation finds it in one place per feature.

const changes = (n: number): string => `${n} ${n === 1 ? 'change' : 'changes'}`;

export const strings = {
  appName: 'Drink Builder',
  navLabel: 'Main',
  back: 'Back',
  titles: {
    drinks: 'Drinks',
    templates: 'Templates',
    stock: 'Stock',
    buyNext: 'Buy Next',
    settings: 'Settings',
    about: 'About',
    data: 'Data',
    newDrink: 'New Drink',
    notFound: 'Not Found',
  },
  buttons: {
    newDrink: 'New Drink',
    openDrinks: 'Open Drinks',
    update: 'Update',
  },
  empty: {
    drinks: 'No drinks yet.',
    templates: 'No template matches.',
    stock: 'Nothing in stock yet. Add what you have to see what you can make.',
    buyNext: 'Based on an empty stock; mark what you have for a closer answer.',
  },
  notFound: {
    title: 'This page is not here',
    text: 'The link points to something that was deleted or never existed.',
  },
  update: {
    available: 'Update available',
    action: 'Update',
  },
  settings: {
    units: 'Amounts shown in',
    unitsHint: 'Entry accepts any unit; this changes only what is shown.',
    unitValues: { metric: 'Metric', us: 'US', imperial: 'Imperial' },
    appearance: 'Appearance',
    themeValues: { system: 'Follow System', light: 'Light', dark: 'Dark' },
    about: 'About',
    aboutHint: 'Version, sources, notes',
    dataHint: (n: number) => `${changes(n)} since the last export.`,
    storage: 'Storage',
    storageUnavailable: 'Not available while your data cannot be saved.',
    storageValues: {
      unknown: 'Checking',
      'not-requested': 'Not requested yet. Asked after you first save something.',
      granted: 'Kept: the browser will not clear your data on its own.',
      denied: 'Not guaranteed: the browser may clear your data when space is short.',
      unsupported: 'This browser cannot promise to keep your data.',
    },
  },
  storage: {
    title: 'Your data cannot be saved here',
    text: (reason: string) => `${reason}. You can browse the drinks, but changes are not kept.`,
    retry: 'Try Again',
    reasons: {
      unavailable: 'This browser blocks local storage here',
      blocked: 'Another window still uses an older version; close it',
      tooNew: 'Your data was saved by a newer version of the app',
      migration: 'Your data could not be upgraded and was left as it was',
      quota: 'The device storage is full',
    },
    seedTitle: 'Data could not be loaded',
    seedText: 'The built-in data did not load. Nothing you entered is affected.',
    notSaved: 'Not saved',
    notSavedText: (reason: string) => `${reason}. The setting was not changed.`,
  },
  data: {
    exportButton: 'Export Everything',
    importButton: 'Import File',
    merge: 'Merge',
    replace: 'Replace Everything',
    cancel: 'Cancel',
    undo: 'Undo',
    dismiss: 'Dismiss',
    deleteBackup: 'Delete Import Backup',
    backupHint: 'A copy of your data from before the last import, kept so it can be undone.',
    lastExport: (date: string) => `Last export: ${date}`,
    neverExported: 'Not exported yet.',
    changesSince: (n: number) => `${changes(n)} since the last export.`,
    nothing: 'Nothing to export yet. Seed data is not part of the file.',
    intro: 'Everything you entered goes into one file. Built-in data is not part of it.',
    summary: (counts: string) => `The file has ${counts}.`,
    mergeHint: (counts: string) =>
      `Merge: ${counts}. Your records stay unless the file has a newer version of a drink.`,
    replaceHint: (counts: string) => `Replace Everything: ${counts}.`,
    migrated: (n: number) =>
      `The file was made by an older version (format ${n}) and is converted.`,
    seedMismatch: (found: string, own: string) =>
      `The file was made with other built-in data (${found}; this app has ${own}). Some references may not be found.`,
    exported: (counts: string) => `Exported ${counts}`,
    imported: (counts: string) => `Imported ${counts}`,
    undone: 'Import undone',
    reminder: (n: number) => `You have ${changes(n)} since your last export.`,
    notSaved: 'Not saved',
    errors: {
      notMixtura: { title: 'The file is not a Mixtura export.', text: 'Nothing was imported.' },
      newer: {
        title: 'The file is from a newer version',
        text: (found: number, supported: number) =>
          `It is format ${found}; this app reads up to ${supported}. Nothing was imported.`,
      },
      unreadable: {
        title: 'The file cannot be read',
        text: (reason: string) => `${reason}. Nothing was imported.`,
      },
      invalid: {
        title: 'The file does not match the format',
        text: (first: string, more: number) =>
          `${first}${more > 0 ? ` (and ${more} more)` : ''}. Nothing was imported.`,
      },
      tooLarge: {
        title: 'The file is too large',
        text: (mb: number) => `Files up to ${mb} MB are read. Nothing was imported.`,
      },
    },
    kinds: {
      ingredients: ['ingredient', 'ingredients'],
      templates: ['template', 'templates'],
      specs: ['spec', 'specs'],
      stock: ['stock entry', 'stock entries'],
      affinities: ['pairing', 'pairings'],
    },
    nothingChanged: 'nothing',
  },
  about: {
    version: 'Version',
    licence: 'Licence: AGPL-3.0-or-later',
    updates: 'Updates are checked when you are online.',
  },
  placeholder: 'This screen is built in a later step.',
} as const;
