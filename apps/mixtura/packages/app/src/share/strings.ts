// Texts of sharing one drink by link: the sheet on the spec screen and the
// screen that opens a link (docs/ui-strings.md, "Share a drink").

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export const shareStrings = {
  // The sheet on the spec screen
  button: 'Share',
  buttonAria: (name: string) => `Share ${name} by link`,
  sheetTitle: (name: string) => `Share ${name}`,
  close: 'Close',
  intro:
    'Anyone you send this link to can add a copy of the drink. The drink is inside the link; nothing is uploaded.',
  preparing: 'Preparing the link',
  linkLabel: 'Link',
  copy: 'Copy Link',
  copied: 'Link copied',
  copyFailed: 'The link could not be copied. Select it above and copy it by hand.',
  systemShare: 'Send…',
  systemShareTitle: (name: string) => `${name} from Drink Builder`,
  tooLongTitle: 'This drink is too big for a link',
  tooLongText: 'Use Export on the Data screen to send it as a file.',
  openData: 'Open Data',
  failed: 'The link could not be made. Nothing was changed.',

  // The screen that opens a link
  title: 'Shared Drink',
  opening: 'Opening the link',
  previewTitle: (name: string | null) =>
    name ? `Somebody sent you ${name}` : 'Somebody sent you a drink',
  previewText: 'It is added to your own drinks; nothing you have is replaced.',
  add: 'Add Drink',
  cancel: 'Not Now',
  alreadyHave: 'You already have this drink. Nothing would change.',
  dismiss: 'Close',
  summary: (c: { specs: number; ingredients: number; templates: number }) => {
    const parts = [
      c.specs > 0 && plural(c.specs, 'version', 'versions'),
      c.ingredients > 0 && plural(c.ingredients, 'ingredient', 'ingredients'),
      c.templates > 0 && plural(c.templates, 'template', 'templates'),
    ].filter((p): p is string => p !== false);
    return parts.length > 0 ? `Adds ${parts.join(', ')}.` : 'Adds nothing.';
  },
  added: 'Drink added',
  errors: {
    damaged: {
      title: 'The link is damaged',
      text: 'It may have been cut off when it was sent. Ask for the link again. Nothing was added.',
    },
    version: {
      title: 'The link is from a newer version',
      text: 'Update the app and open the link again. Nothing was added.',
    },
    tooLarge: {
      title: 'The link holds too much',
      text: 'It is larger than a file this app reads. Nothing was added.',
    },
    notDrink: {
      title: 'The link is not a drink from Drink Builder',
      text: 'Nothing was added.',
    },
    noStorage: {
      title: 'This browser cannot keep drinks',
      text: 'Storage is not available, so the drink cannot be added. Nothing was added.',
    },
  },
} as const;
