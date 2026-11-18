/** Every visible text of the app, English. Screens and the shell import from here only. */
export const strings = {
  appName: "Cook's Notebook",
  noScript: "Cook's Notebook needs JavaScript.",
  skipToContent: 'Skip to content',
  nav: {
    label: 'Main',
    ratios: 'Ratios',
    components: 'Components',
    dishes: 'Dishes',
    settings: 'Settings',
  },
  screens: {
    ratios: {
      title: 'Ratios',
      empty: 'Nothing here yet. Ratio templates will be listed on this screen.',
      guidanceSummary: 'What belongs here',
      guidance: 'Parts by weight and the range cooks accept, with your own versions beside them.',
    },
    components: {
      title: 'Components',
      empty:
        'Nothing here yet. Stocks, sauces, doughs and other parts of a dish will be listed on this screen.',
      guidanceSummary: 'What belongs here',
      guidance: 'Parts you make once and use in many dishes, with their yield.',
    },
    dishes: {
      title: 'Dishes',
      empty: 'Nothing here yet. Dishes built from components will be listed on this screen.',
      guidanceSummary: 'What belongs here',
      guidance: 'A dish is a set of components and parts, with tasting notes on each version.',
    },
  },
  settings: {
    title: 'Settings',
    themeLegend: 'Theme',
    themeSystem: 'Follow system',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeNotSaved:
      'The choice could not be saved on this device. It applies until the app is closed.',
    privacy: 'Everything stays on this device. Nothing is sent anywhere.',
    engineLine: (name: string): string => `Engine: ${name}`,
  },
} as const;
