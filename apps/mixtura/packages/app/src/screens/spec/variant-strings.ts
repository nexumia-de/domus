// Fixed texts of the variant suggestions on the spec screen (#37). They say
// what changes and never claim the result tastes the same or is balanced.
export const variantStrings = {
  title: 'Variants',
  intro: (template: string) =>
    `Starting points that follow the ${template} template with another kind of base.`,
  start: (name: string) => `Start a Riff as ${name}`,
  startAria: (name: string, drink: string) =>
    `Start a riff on ${drink} as ${name}: opens the editor with the variant's slots`,
  replaces: (names: string, note: string | undefined) =>
    note
      ? `Replaces ${names} with a base of your choice: ${note}.`
      : `Replaces ${names} with a base of your choice.`,
  replacesNothing: 'The base slot is left open for you to fill.',
  keeps: (names: string) => `Carries over ${names}.`,
  caveat:
    'A different drink: the taste and the balance change. The figures are worked out again once you have chosen.',
  evidence: (kind: string) => `Slot ratios of the variant: ${kind}.`,
  none: 'This drink matches a template that has no variant here.',
  alcoholNone: 'without alcohol',
  alcoholLow: 'low ABV',
  /** In the editor, above the lines of a riff that started as a variant. */
  editorNote: (name: string) =>
    `Started as ${name}: the base is open for you to choose. The balance shows once it is filled.`,
};
