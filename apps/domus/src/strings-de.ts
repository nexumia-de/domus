// The German set: the keys and signatures of strings.ts. The form of address is "du"; the apps'
// names stay as they are. Wording never blames the person.
import type { Strings } from './strings';

export const stringsDe: Strings = {
  appName: 'Haushalt',
  skip: 'Zum Inhalt springen',
  common: {
    back: 'Zurück',
    cancel: 'Abbrechen',
    continue: 'Weiter',
    loading: 'Lädt …',
    show: 'Zeigen',
    hide: 'Verbergen',
  },
  display: {
    legend: 'Darstellung',
    language: 'Sprache',
    langDevice: 'Wie das Gerät',
    langEn: 'English',
    langDe: 'Deutsch',
    theme: 'Farbschema',
    themeSystem: 'Wie das Gerät',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    notSaved: 'Die Wahl konnte auf diesem Gerät nicht gespeichert werden.',
  },
  time: {
    justNow: 'gerade eben',
    minutes: (n) => `vor ${n} Min.`,
    hours: (n) => `vor ${n} Std.`,
  },
  home: {
    title: 'Haushalt',
    intro: 'Apps, die ihre Daten auf diesem Gerät behalten. Jede lässt sich für sich installieren.',
    appsLabel: 'Apps',
    apps: [
      { href: 'mixtura/', name: 'Drink Builder', what: 'Eine Werkbank für Mixgetränke' },
      { href: 'culina/', name: 'Cook’s Workbench', what: 'Ein Helfer in der Küche' },
      { href: 'emptio/', name: 'Einkaufsliste', what: 'Die Einkaufsliste des Haushalts' },
    ],
    syncTitle: 'Abgleich',
    syncIntro:
      'Halte die Apps auf deinen Geräten gleich, oder teile sie mit anderen, über einen Speicher deiner Wahl.',
    empty:
      'Ein Raum ist eine Gruppe von Menschen und das, was sie teilen, zum Beispiel ein Haushalt: Jedes Gerät, das das Geheimnis des Raums kennt, hält dieselben Daten gleich. Die Daten laufen verschlüsselt über einen Speicher deiner Wahl, und nichts verlässt dieses Gerät, bis du einen Raum anlegst oder beitrittst.',
    spacesLabel: 'Räume auf diesem Gerät',
    create: 'Raum anlegen',
    join: 'Mit einem Link beitreten',
    joinTitle: 'Mit einem Link beitreten',
    joinLabel: 'Einladungslink',
    joinHint: 'Füge den Link ein, den dir jemand geschickt hat, oder sein Ende ab #/join/.',
    joinButton: 'Weiter',
  },
  storage: {
    deviceOnly: 'Nur auf diesem Gerät',
  },
  status: {
    never: 'Noch nie abgeglichen',
    inStep: (ago) => `Abgeglichen · ${ago}`,
    failed: 'Letzter Abgleich fehlgeschlagen',
    syncing: 'Gleicht ab …',
  },
  create: {
    title: 'Raum anlegen',
    stepOf: (n, total) => `Schritt ${n} von ${total}`,
    name: {
      heading: 'Gib dem Raum einen Namen',
      explain: 'So nennt ihr ihn. Du kannst den Namen später ändern.',
      label: 'Name',
      suggestion: 'Zuhause',
      invalid: 'Gib einen Namen mit 1 bis 60 Zeichen ein.',
    },
    type: {
      heading: 'Wo liegen die Dateien?',
      explain:
        'Die Dateien werden auf diesem Gerät verschlüsselt, bevor sie es verlassen. Der Speicher hält sie nur.',
      github: {
        title: 'GitHub',
        what: 'Ein privates Repository von dir. Braucht ein GitHub-Konto und einen Token für genau dieses Repository.',
      },
      webdav: {
        title: 'WebDAV',
        what: 'Ein Ordner auf einem WebDAV-Server, zum Beispiel Nextcloud. Braucht die Adresse des Servers und ein Konto dort; der Server muss Anfragen von dieser Seite zulassen (CORS).',
      },
    },
    github: {
      heading: 'GitHub verbinden',
      explain: 'Drei Schritte, einer nach dem anderen.',
      step1: 'Ein privates Repository',
      step1Text:
        'Öffne das Formular von GitHub mit schon eingetragenem Namen und lege das Repository als privat an. Ein vorhandenes privates Repository geht auch; dann kannst du diesen Schritt überspringen.',
      step1Button: '„Neues Repository“ auf GitHub öffnen',
      step2: 'Ein Token nur für dieses Repository',
      step2Text:
        'Öffne das Formular von GitHub: Name, ein Jahr Gültigkeit und die Berechtigung sind schon eingetragen. Dann:',
      step2Button: '„Neuer Token“ auf GitHub öffnen',
      step2List: [
        'Wähle unter „Repository access“ die Option „Only select repositories“ und das Repository.',
        'Prüfe, dass bei „Contents“ „Read and write“ steht; Name und Gültigkeit kannst du ändern.',
        'Klicke auf „Generate token“ und kopiere den Token.',
      ],
      tokenName: 'Haushalt',
      step3: 'Füge den Token hier ein',
      tokenHint: 'Er bleibt auf diesem Gerät. Er geht nur an GitHub und kommt nie in eine Adresse.',
      checking: 'Schaut bei GitHub nach …',
      none: 'Der Token erreicht kein Repository. Erzeuge den Token neu und wähle unter „Only select repositories“ das Repository.',
      noneWritable:
        'Der Token erreicht Repositories, darf aber in keinem schreiben. Erzeuge ihn neu mit „Contents“ auf „Read and write“.',
      pickHeading: 'Welches Repository?',
      pickExplain: 'Der Token erreicht mehrere Repositories. Wähle das für den Haushalt.',
      private: 'privat',
      public: 'öffentlich',
      publicTitle: 'Dieses Repository ist öffentlich',
      publicText: (repository) =>
        `Die Dateien in ${repository} sind verschlüsselt, aber jeder kann sehen, dass es sie gibt und wie oft sie sich ändern. Ein privates Repository ist besser.`,
      publicUse: 'Trotzdem verwenden',
      publicOther: 'Anderes Repository wählen',
      readonlyTitle: 'Der Token darf nicht schreiben',
      readonlyText: (repository) =>
        `Der Token darf ${repository} lesen, aber nicht darin schreiben. Erzeuge ihn neu mit „Contents“ auf „Read and write“ und füge ihn hier ein.`,
    },
    webdav: {
      heading: 'WebDAV-Ordner verbinden',
      explain: 'Adresse, Benutzername und Passwort bleiben auf diesem Gerät.',
      address: 'Adresse',
      addressHint:
        'Die WebDAV-Adresse eines vorhandenen Ordners, beginnend mit https://. Bei Nextcloud endet sie auf /remote.php/dav/files/ und deinen Benutzernamen.',
      test: 'Verbindung testen',
      testing: 'Testet …',
      connected: 'Verbunden. Der Speicher hat geantwortet und diese Seite kann die Antwort lesen.',
      badAddress:
        'Die Adresse muss mit https:// beginnen und darf weder Benutzername noch Passwort enthalten.',
    },
    finish: {
      heading: 'Raum anlegen',
      explain:
        'Dabei entsteht das Geheimnis des Raums auf diesem Gerät, seine erste Datei wird in den Speicher geschrieben und wieder gelesen.',
      nameLine: 'Name',
      storageLine: 'Speicher',
      button: 'Raum anlegen',
      creating: 'Legt den Raum an und schreibt seine erste Datei …',
      failedTitle: 'Der Raum wurde nicht angelegt',
      failedHint:
        'Auf diesem Gerät wurde nichts behalten. Behebe die Ursache und versuche es noch einmal.',
    },
  },
  space: {
    notFound: 'Diesen Raum gibt es auf diesem Gerät nicht.',
    home: 'Zurück zum Haushalt',
    nameLabel: 'Name',
    rename: 'Umbenennen',
    nameSaved: 'Der Name ist gespeichert.',
    invalidName: 'Gib einen Namen mit 1 bis 60 Zeichen ein.',
    storageTitle: 'Speicher',
    lastTitle: 'Letzter Abgleich',
    syncNow: 'Jetzt abgleichen',
    syncing: 'Gleicht ab …',
    invite: 'Jemanden einladen',
    changeAccess: 'Zugang zum Speicher ändern',
    remove: 'Von diesem Gerät entfernen',
    removeTitle: 'Diesen Raum von diesem Gerät entfernen?',
    removeText:
      'Der Raum, sein Geheimnis und der Zugang zum Speicher werden nur auf diesem Gerät gelöscht. Die Dateien im Speicher bleiben, und andere Geräte sind nicht betroffen. Ist dies das einzige Gerät, das das Geheimnis kennt, kann niemand die Dateien mehr öffnen.',
    removeConfirm: 'Entfernen',
    removeDeviceOnlyText:
      'Dieser Raum liegt nur auf diesem Gerät, und es gibt nirgendwo eine Kopie. Der Raum, sein Geheimnis und alles, was die Apps darin ablegen, zum Beispiel der Vorrat, werden endgültig gelöscht und lassen sich nicht zurückholen.',
    deviceOnlyText:
      'Dieser Raum und was die Apps darin ablegen, zum Beispiel der Vorrat, liegen nur auf diesem Gerät. Nichts wird irgendwohin gesendet.',
    connect: 'Speicher verbinden',
    connected: (storage) =>
      `Der Raum wird jetzt über ${storage} abgeglichen. Öffne die Apps einmal, damit sie senden, was sie ablegen.`,
    removed: 'Der Raum wurde von diesem Gerät entfernt.',
    created:
      'Der Raum ist angelegt. Seine erste Datei wurde in den Speicher geschrieben und wieder gelesen.',
    joined: (name) => `Du bist „${name}“ beigetreten.`,
    joinedEmpty:
      'Im Speicher liegen für diesen Raum noch keine Daten; vielleicht hat das Gerät, das eingeladen hat, noch nicht abgeglichen. „Jetzt abgleichen“ schaut später noch einmal nach.',
    accessSaved: 'Der Zugang ist gespeichert.',
  },
  connect: {
    title: 'Speicher verbinden',
    intro: (name) =>
      `„${name}“ liegt nur auf diesem Gerät. Mit einem Speicher wird der Raum auf deinen Geräten abgeglichen und lässt sich teilen; der Raum, sein Geheimnis und seine Daten bleiben, wie sie sind.`,
    heading: 'Den Speicher verbinden',
    explain:
      'Das schreibt die erste Datei des Raums in den Speicher und liest sie wieder. Was die Apps im Raum ablegen, folgt, wenn du sie öffnest.',
    spaceLine: 'Raum',
    storageLine: 'Speicher',
    button: 'Speicher verbinden',
    connecting: 'Verbindet den Speicher und schreibt die erste Datei …',
    failedTitle: 'Der Speicher wurde nicht verbunden',
    failedHint:
      'Der Raum bleibt nur auf diesem Gerät, und nichts davon wurde entfernt. Behebe die Ursache und versuche es noch einmal.',
  },
  access: {
    title: 'Zugang zum Speicher ändern',
    githubIntro:
      'Erzeuge einen neuen Token für dasselbe Repository und füge ihn hier ein. Er braucht „Contents“ auf „Read and write“.',
    webdavIntro: 'Gib Benutzername und Passwort des Speichers noch einmal ein.',
    save: 'Zugang speichern',
    saving: 'Prüft und speichert …',
  },
  invite: {
    title: 'Jemanden einladen',
    intro:
      'Zeige den QR-Code oder schicke den Link. Die andere Person öffnet ihn in dieser App und tritt dem Raum bei.',
    include: 'Zugang zum Speicher beilegen',
    includeGithub:
      'Die andere Person kann dann alles in diesem einen Repository lesen und schreiben, im Namen dessen, der den Token erzeugt hat, und braucht kein eigenes GitHub-Konto. Wer den Link bekommt, bekommt dasselbe.',
    includeWebdav:
      'Die andere Person kann dann alles lesen und schreiben, was der Benutzername auf diesem Server darf. Wer den Link bekommt, bekommt dasselbe.',
    without:
      'Ohne ihn gibt die andere Person beim Beitreten ihren eigenen Zugang zum Speicher ein, bei GitHub einen eigenen Token für das Repository.',
    alwaysTitle: 'Was die Einladung immer enthält',
    always:
      'Das Geheimnis des Raums. Wer es hat, kann alles im Raum lesen und ändern. Behandle den Link wie einen Schlüssel: Er lässt sich nicht zurückholen, nur durch einen neuen Raum ersetzen.',
    linkLabel: 'Einladungslink',
    copy: 'Link kopieren',
    copied: 'Kopiert',
    copyFailed: 'Das Kopieren hat nicht geklappt. Markiere den Link und kopiere ihn von Hand.',
    share: 'Teilen …',
    qrLabel: 'QR-Code des Einladungslinks',
    qrTooLong: 'Der Link ist für einen QR-Code zu lang. Schicke stattdessen den Link.',
    qrNote: 'Auf diesem Gerät gezeichnet; der Link wird nirgends hingeschickt.',
    backToSpace: 'Zurück zum Raum',
  },
  join: {
    title: 'Einem Raum beitreten',
    problemTitle: 'Diese Einladung lässt sich nicht verwenden',
    spaceLine: 'Raum',
    unnamed: 'Ein Raum',
    storageLine: 'Speicher',
    accessIncluded: 'Die Einladung enthält den Zugang zum Speicher.',
    accessNeeded:
      'Die Einladung enthält keinen Zugang zum Speicher. Gib unten deinen eigenen ein und tritt dann bei.',
    githubSteps: 'Du brauchst einen Token für dieses Repository, so erzeugt:',
    githubStepsList: [
      'Öffne das Formular „Neuer Token“ von GitHub; Name, Gültigkeit und „Contents: Read and write“ sind eingetragen.',
      'Wähle unter „Repository access“ die Option „Only select repositories“ und dieses Repository.',
      'Erzeuge den Token, kopiere ihn und füge ihn unten ein.',
    ],
    openTokenPage: '„Neuer Token“ auf GitHub öffnen',
    button: 'Beitreten',
    joining: 'Tritt bei …',
    alreadyHere: (name) =>
      name === undefined
        ? 'Dieser Raum ist schon auf diesem Gerät.'
        : `„${name}“ ist schon auf diesem Gerät.`,
    open: 'Öffnen',
    readonly: (repository) =>
      `Der Token darf ${repository} lesen, aber nicht darin schreiben. Erzeuge einen Token mit „Contents“ auf „Read and write“.`,
    errors: {
      empty: 'Füge zuerst den Einladungslink ein.',
      'not-a-link':
        'Das ist kein Einladungslink. Er sollte auf #/join/ und einen langen Text enden. Kopiere den ganzen Link noch einmal.',
      'not-json': 'Die Einladung ist beschädigt oder abgeschnitten. Bitte um eine neue.',
      invalid: 'Die Einladung ist beschädigt oder abgeschnitten. Bitte um eine neue.',
      'not-an-invite': 'Die Einladung ist beschädigt oder abgeschnitten. Bitte um eine neue.',
      'older-version':
        'Diese Einladung stammt von einer älteren Version, die nicht mehr gelesen wird. Bitte um eine neue.',
      'newer-version':
        'Diese Einladung stammt von einer neueren Version. Lade diese Seite neu, um sie zu aktualisieren, und öffne den Link dann noch einmal.',
      'unknown-storage': 'Diese Einladung gilt für eine Art Speicher, die diese App nicht kennt.',
      'bad-address':
        'Die Speicheradresse in dieser Einladung ist ungültig. Bitte um eine neue Einladung.',
    },
  },
  fields: {
    tokenLabel: 'Token',
    user: 'Benutzername',
    password: 'Passwort',
    webdavOptional: 'Lass beides leer, wenn der Server keine Anmeldung braucht.',
    showTokenAria: 'Token zeigen',
    hideTokenAria: 'Token verbergen',
    showPasswordAria: 'Passwort zeigen',
    hidePasswordAria: 'Passwort verbergen',
    emptyToken: 'Füge zuerst den Token ein.',
  },
  failures: {
    generic: {
      conflict:
        'Ein anderes Gerät hat gleichzeitig geschrieben, und dieses hat nach einigen Versuchen aufgegeben. Nichts ging verloren; „Jetzt abgleichen“ versucht es noch einmal.',
      unauthorised:
        'Der Speicher hat die Anmeldung abgelehnt. Prüfe den Zugang, den du angegeben hast, und versuche es noch einmal.',
      'not-found':
        'Der Speicher hat nicht gefunden, was er braucht. Prüfe seine Adresse und ob der Ordner existiert.',
      unreachable:
        'Es gibt keine Verbindung. Dieses Gerät scheint offline zu sein; versuche es noch einmal, wenn es online ist.',
      blocked:
        'Der Speicher hat so geantwortet, dass diese Seite die Antwort nicht lesen darf, meist weil er Anfragen von dieser Seite nicht zulässt (CORS), oder die Adresse stimmt nicht.',
      server:
        'Der Speicher hat mit einem Fehler geantwortet. Versuche es in einer Weile noch einmal.',
      'not-sealed':
        'Die Datei im Speicher gehört nicht zu diesen Apps. Es wurde nichts überschrieben. Prüfe, dass der Ordner nicht für etwas anderes benutzt wird.',
      'newer-version':
        'Die Dateien stammen von einer neueren Version der Apps. Lade diese Seite neu, um sie zu aktualisieren, und versuche es noch einmal.',
      'wrong-key':
        'Die Dateien im Speicher lassen sich mit dem Geheimnis dieses Raums nicht öffnen: Sie gehören zu einem anderen Raum, oder sie wurden verändert. Es wurde nichts überschrieben.',
      'bad-document':
        'Die Datei im Speicher ließ sich öffnen, ihr Inhalt ist aber beschädigt. Es wurde nichts überschrieben.',
      'other-space':
        'Die Datei im Speicher gehört zu einem anderen Raum. Es wurde nichts überschrieben.',
      'other-collection':
        'Die Datei im Speicher gehört zu etwas anderem als erwartet. Es wurde nichts überschrieben.',
      'bad-now':
        'Die Uhr dieses Geräts ist nicht auf eine gültige Zeit gestellt. Korrigiere Datum und Uhrzeit des Geräts und versuche es noch einmal.',
      'bad-storage':
        'Die Speichereinstellungen dieses Raums sind nicht brauchbar (Adresse oder Zugang fehlen oder sind falsch). Entferne den Raum von diesem Gerät und tritt ihm mit einer Einladung neu bei.',
      'bad-secret':
        'Das Geheimnis dieses Raums ist auf diesem Gerät beschädigt. Entferne den Raum von diesem Gerät und tritt ihm mit einer Einladung neu bei.',
      'store-unavailable':
        'Dieser Browser lässt die Seite keine Daten behalten (ein privates Fenster oder gesperrte Websitedaten?). Räume lassen sich hier nicht speichern.',
      'store-blocked':
        'Ein anderer offener Tab dieser Adresse hält die Daten zurück. Schließe die anderen Tabs und lade diese Seite neu.',
      unexpected:
        'Etwas Unerwartetes ist schiefgegangen. Lade die Seite neu und versuche es noch einmal.',
    },
    github: {
      unauthorised:
        'GitHub hat den Token abgelehnt. Prüfe, ob du ihn ganz kopiert hast und ob er nicht abgelaufen oder widerrufen ist. Ein neuer Token mit „Contents“ auf „Read and write“ für dieses Repository behebt das.',
      'not-found':
        'GitHub kennt dieses Repository nicht, oder der Token erreicht es nicht. Prüfe, ob der Token genau für dieses Repository erzeugt wurde.',
      blocked:
        'Der Browser hat dieser Seite den Weg zu GitHub nicht erlaubt. Vielleicht stört ein Inhaltsblocker oder ein Netzfilter; versuche es ohne.',
    },
    webdav: {
      unauthorised:
        'Der Speicher hat Benutzername oder Passwort abgelehnt. Prüfe beides und versuche es noch einmal.',
      'not-found':
        'Der Ordner wurde nicht gefunden oder ließ sich nicht anlegen. Prüfe die Adresse.',
      blocked:
        'Der Speicher hat so geantwortet, dass diese Seite die Antwort nicht lesen darf, meist weil er Anfragen von dieser Seite nicht zulässt (CORS). Prüfe auch die Adresse.',
    },
    httpStatus: (status) => ` (Antwort ${status})`,
    rateLimitedUntil: (time) => `GitHub meldet zu viele Anfragen. Gleiche nach ${time} wieder ab.`,
    rateLimited:
      'GitHub meldet zu viele Anfragen. Warte ein paar Minuten und versuche es noch einmal.',
  },
};
