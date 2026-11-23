// The texts the native apps have in common, English and German: the style choice, the spaces,
// joining, creating and leaving a space, the sync status words, and the few words around them. An app adds its
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
  create: {
    row: string;
    rowHint: string;
    title: string;
    description: string;
    name: string;
    nameSuggestion: string;
    storage: string;
    kinds: { github: string; webdav: string };
    repository: string;
    token: string;
    tokenHint: string;
    address: string;
    user: string;
    password: string;
    webdavHint: string;
    button: string;
    creating: string;
    created: (name: string) => string;
    errors: {
      name: string;
      repository: string;
      token: string;
      address: string;
      readonly: string;
      failed: (why: string) => string;
    };
    publicTitle: string;
    publicBody: string;
    publicUse: string;
  };
  leave: {
    button: (name: string) => string;
    title: (name: string) => string;
    body: string;
    bodyDeviceOnly: string;
    confirm: string;
    left: (name: string) => string;
  };
  cancel: string;
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
  create: {
    row: 'Create a Space',
    rowHint: 'Kept in step through a GitHub repository or a WebDAV folder',
    title: 'Create a Space',
    description:
      'The space’s files are encrypted on this device before they are sent; the storage only holds them. Invitations are made in the Household app in a browser.',
    name: 'Name',
    nameSuggestion: 'Household',
    storage: 'Storage',
    kinds: { github: 'GitHub Repository', webdav: 'WebDAV Folder' },
    repository: 'Repository (owner/name)',
    token: 'Access token',
    tokenHint:
      'A fine-grained token that may read and write the contents of this one repository. A private repository is best.',
    address: 'Folder address (https://…)',
    user: 'User name (optional)',
    password: 'Password (optional)',
    webdavHint: 'Leave the user name and password empty if the server needs no sign-in.',
    button: 'Create',
    creating: 'Creating …',
    created: (name) => `Created ${name}.`,
    errors: {
      name: 'Enter a name of 1 to 60 characters.',
      repository: 'Enter the repository as owner/name.',
      token: 'Enter the access token of the repository.',
      address: 'Enter an https address without a user name or password in it.',
      readonly: 'The token may read this repository but not write to it.',
      failed: (why) => `The space was not created: ${why}. Nothing was kept on this device.`,
    },
    publicTitle: 'This Repository Is Public',
    publicBody:
      'The files are encrypted, but anyone can see that they exist and when they change. A private repository is better.',
    publicUse: 'Use Anyway',
  },
  leave: {
    button: (name) => `Leave ${name}`,
    title: (name) => `Leave “${name}”?`,
    body: 'The space, its secret and the access to its storage are deleted from this app on this device, with everything this app keeps of the space here. The files in the storage stay, and other devices and the other apps are not affected. If nothing else knows the secret, nobody can open the files again.',
    bodyDeviceOnly:
      'This space is on this device only, and no copy exists anywhere else. The space and everything this app keeps in it are deleted for good and cannot be brought back.',
    confirm: 'Leave',
    left: (name) => `Left ${name}.`,
  },
  cancel: 'Cancel',
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
  create: {
    row: 'Space anlegen',
    rowHint: 'Abgeglichen über ein GitHub-Repository oder einen WebDAV-Ordner',
    title: 'Space anlegen',
    description:
      'Die Dateien des Space werden auf diesem Gerät verschlüsselt, bevor sie gesendet werden; der Speicher bewahrt sie nur auf. Einladungen entstehen in der App Haushalt im Browser.',
    name: 'Name',
    nameSuggestion: 'Haushalt',
    storage: 'Speicher',
    kinds: { github: 'GitHub-Repository', webdav: 'WebDAV-Ordner' },
    repository: 'Repository (Besitzer/Name)',
    token: 'Zugangstoken',
    tokenHint:
      'Ein fein abgestuftes Token, das die Inhalte dieses einen Repositorys lesen und schreiben darf. Ein privates Repository ist am besten.',
    address: 'Adresse des Ordners (https://…)',
    user: 'Benutzername (freiwillig)',
    password: 'Passwort (freiwillig)',
    webdavHint: 'Benutzername und Passwort leer lassen, wenn der Server keine Anmeldung braucht.',
    button: 'Anlegen',
    creating: 'Wird angelegt …',
    created: (name) => `${name} angelegt.`,
    errors: {
      name: 'Einen Namen mit 1 bis 60 Zeichen eingeben.',
      repository: 'Das Repository als Besitzer/Name eingeben.',
      token: 'Das Zugangstoken des Repositorys eingeben.',
      address: 'Eine https-Adresse ohne Benutzernamen oder Passwort darin eingeben.',
      readonly: 'Das Token darf dieses Repository lesen, aber nicht hineinschreiben.',
      failed: (why) =>
        `Der Space wurde nicht angelegt: ${why}. Auf diesem Gerät wurde nichts behalten.`,
    },
    publicTitle: 'Dieses Repository ist öffentlich',
    publicBody:
      'Die Dateien sind verschlüsselt, aber jeder kann sehen, dass es sie gibt und wann sie sich ändern. Ein privates Repository ist besser.',
    publicUse: 'Trotzdem verwenden',
  },
  leave: {
    button: (name) => `${name} verlassen`,
    title: (name) => `„${name}“ verlassen?`,
    body: 'Der Space, sein Geheimnis und der Zugang zu seinem Speicher werden in dieser App auf diesem Gerät gelöscht, mit allem, was diese App hier vom Space aufbewahrt. Die Dateien im Speicher bleiben, und andere Geräte und die anderen Apps sind nicht betroffen. Kennt sonst niemand das Geheimnis, kann niemand die Dateien mehr öffnen.',
    bodyDeviceOnly:
      'Dieser Space liegt nur auf diesem Gerät, und es gibt nirgendwo eine Kopie. Der Space und alles, was diese App darin aufbewahrt, werden endgültig gelöscht und lassen sich nicht zurückholen.',
    confirm: 'Verlassen',
    left: (name) => `${name} verlassen.`,
  },
  cancel: 'Abbrechen',
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
