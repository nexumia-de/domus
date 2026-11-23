// The texts only the native app has; everything else is the web app's, and the style, the spaces,
// joining, the sync status words and the support link are shared with the other native apps
// (`@nexumia-de/gjs/texts`).
import { sharedDe, sharedEn, type SharedTexts } from '@nexumia-de/gjs/texts';

export interface NativeStrings extends SharedTexts {
  menu: { categories: string; preferences: string; about: string };
  spacesIntro: string;
  comments: string;
}

export const nativeEn: NativeStrings = {
  ...sharedEn,
  menu: { categories: 'Categories', preferences: 'Preferences', about: 'About Shopping List' },
  spacesIntro:
    'A space is a household, or this device alone. Each space has its own list. A space can be created here; it is shared from the Household app in a browser, and this app joins one by its invitation link.',
  comments: 'The household’s shopping list with priorities, kept on this device.',
};

export const nativeDe: NativeStrings = {
  ...sharedDe,
  menu: { categories: 'Kategorien', preferences: 'Einstellungen', about: 'Info zu Einkaufsliste' },
  spacesIntro:
    'Ein Space ist ein Haushalt oder dieses Gerät allein. Jeder Space hat seine eigene Liste. Ein Space kann hier angelegt werden; geteilt wird er in der App Haushalt im Browser, und diese App tritt einem über seinen Einladungslink bei.',
  comments: 'Die Einkaufsliste des Haushalts mit Dringlichkeit, auf diesem Gerät gespeichert.',
};
