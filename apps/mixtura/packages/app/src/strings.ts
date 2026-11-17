// Fixed texts of the shell, from docs/ui-strings.md. Screens add their
// own strings next to their code; every text is a constant so a later
// translation finds it in one place per feature.

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
  about: {
    version: 'Version',
    licence: 'Licence: AGPL-3.0-or-later',
    updates: 'Updates are checked when you are online.',
  },
  placeholder: 'This screen is built in a later step.',
} as const;
