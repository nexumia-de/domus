// The texts the native apps have in common, English and German: the style choice, the spaces,
// joining a space by link, the sync status words, and the few words around them. An app adds its
// own (what a space holds, its description). Pure: no `gi://`, so Node tests import it.
import type { StatusWords } from '@nexumia-de/hospes';

export interface SharedTexts {
  preferences: {
    appearance: string;
    style: string;
    styles: { system: string; light: string; dark: string };
    spaces: string;
    unnamedSpace: string;
    homeSpace: string;
  };
  join: {
    title: string;
    description: string;
    link: string;
    token: string;
    joined: (name: string) => string;
    errors: {
      empty: string;
      'not-an-invitation': string;
      'needs-token': string;
      'already-here': string;
    };
  };
  failure: { write: string; retry: string };
  support: string;
  status: StatusWords;
}

export const sharedEn: SharedTexts = {
  preferences: {
    appearance: 'Appearance',
    style: 'Style',
    styles: { system: 'Follow System', light: 'Light', dark: 'Dark' },
    spaces: 'Spaces',
    unnamedSpace: 'Unnamed space',
    homeSpace: 'This device',
  },
  join: {
    title: 'Join a Space',
    description: 'The token is only needed when the invitation carries no access to the storage.',
    link: 'Invitation link',
    token: 'Access token (optional)',
    joined: (name) => `Joined ${name}.`,
    errors: {
      empty: 'Paste an invitation link first.',
      'not-an-invitation': 'This is not an invitation link.',
      'needs-token': 'This invitation carries no access. Enter the token of the storage.',
      'already-here': 'This space is already on this device.',
    },
  },
  failure: { write: 'The change could not be saved.', retry: 'Try Again' },
  support: 'Support Development',
  status: {
    deviceOnly: 'On this device only',
    syncing: 'Syncing …',
    never: 'Not synced yet',
    offline: 'Offline',
    inStep: (ago) => `In step · ${ago}`,
    failed: (why) => `Last sync failed: ${why}`,
    justNow: 'just now',
    minutes: (n) => `${n} min ago`,
    hours: (n) => `${n} h ago`,
    failures: {
      unauthorised: 'the storage refused the access',
      'not-found': 'the storage was not found',
      unreachable: 'the storage could not be reached',
      blocked: 'the storage asks to wait',
      conflict: 'another device was writing',
      storage: 'this version does not know the storage',
      'wrong-key': 'the file in the storage belongs to another space',
      'newer-version': 'the file in the storage needs a newer version of the app',
      other: 'the file in the storage could not be read',
    },
  },
};

export const sharedDe: SharedTexts = {
  preferences: {
    appearance: 'Darstellung',
    style: 'Stil',
    styles: { system: 'System folgen', light: 'Hell', dark: 'Dunkel' },
    spaces: 'Spaces',
    unnamedSpace: 'Space ohne Namen',
    homeSpace: 'Dieses Gerät',
  },
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
  failure: { write: 'Die Änderung konnte nicht gespeichert werden.', retry: 'Erneut versuchen' },
  support: 'Entwicklung unterstützen',
  status: {
    deviceOnly: 'Nur auf diesem Gerät',
    syncing: 'Wird abgeglichen …',
    never: 'Noch nicht abgeglichen',
    offline: 'Offline',
    inStep: (ago) => `Auf dem Stand · ${ago}`,
    failed: (why) => `Letzter Abgleich fehlgeschlagen: ${why}`,
    justNow: 'gerade eben',
    minutes: (n) => `vor ${n} Min.`,
    hours: (n) => `vor ${n} Std.`,
    failures: {
      unauthorised: 'der Speicher hat den Zugang abgelehnt',
      'not-found': 'der Speicher wurde nicht gefunden',
      unreachable: 'der Speicher war nicht erreichbar',
      blocked: 'der Speicher bittet zu warten',
      conflict: 'ein anderes Gerät hat gerade geschrieben',
      storage: 'diese Version kennt den Speicher nicht',
      'wrong-key': 'die Datei im Speicher gehört zu einem anderen Space',
      'newer-version': 'die Datei im Speicher braucht eine neuere Version der App',
      other: 'die Datei im Speicher konnte nicht gelesen werden',
    },
  },
};
