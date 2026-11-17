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
  },
  about: {
    version: 'Version',
    licence: 'Licence: AGPL-3.0-or-later',
    updates: 'Updates are checked when you are online.',
  },
  placeholder: 'This screen is built in a later step.',
} as const;
