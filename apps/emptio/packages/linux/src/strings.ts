// The texts only the native app has; everything else is the web app's.
export const nativeEn = {
  menu: { categories: 'Categories', preferences: 'Preferences', about: 'About Shopping List' },
  join: {
    title: 'Join a Space',
    description: 'The token is only needed when the invitation carries no access to the storage.',
    link: 'Invitation link',
    token: 'Access token (optional)',
    joined: (name: string) => `Joined ${name}.`,
    errors: {
      empty: 'Paste an invitation link first.',
      'not-an-invitation': 'This is not an invitation link.',
      'needs-token': 'This invitation carries no access. Enter the token of the storage.',
      'already-here': 'This space is already on this device.',
    },
  },
  spaces: 'Spaces',
  spacesIntro:
    'A space is a household, or this device alone. Each space has its own list. A space is made and shared in the Household app in a browser; this app joins it by its invitation link.',
  appearance: 'Appearance',
  theme: 'Style',
  comments: 'The household’s shopping list with priorities, kept on this device.',
  support: 'Support Development',
};

export type NativeStrings = typeof nativeEn;

export const nativeDe: NativeStrings = {
  menu: { categories: 'Kategorien', preferences: 'Einstellungen', about: 'Info zu Einkaufsliste' },
  join: {
    title: 'Einem Space beitreten',
    description: 'Das Token ist nur nötig, wenn die Einladung keinen Zugang zum Speicher enthält.',
    link: 'Einladungslink',
    token: 'Zugangstoken (freiwillig)',
    joined: (name) => `${name} beigetreten.`,
    errors: {
      empty: 'Zuerst einen Einladungslink einfügen.',
      'not-an-invitation': 'Das ist kein Einladungslink.',
      'needs-token': 'Diese Einladung enthält keinen Zugang. Das Token des Speichers eingeben.',
      'already-here': 'Dieser Space ist schon auf diesem Gerät.',
    },
  },
  spaces: 'Spaces',
  spacesIntro:
    'Ein Space ist ein Haushalt oder dieses Gerät allein. Jeder Space hat seine eigene Liste. Ein Space wird in der App Haushalt im Browser angelegt und geteilt; diese App tritt ihm über seinen Einladungslink bei.',
  appearance: 'Darstellung',
  theme: 'Stil',
  comments: 'Die Einkaufsliste des Haushalts mit Dringlichkeit, auf diesem Gerät gespeichert.',
  support: 'Entwicklung unterstützen',
};
