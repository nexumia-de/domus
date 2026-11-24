// German texts of the hand-over on a dish's page; the keys and signatures of
// ../strings-handover.ts. The sister app is "Einkaufsliste" in German.
import type { handOverStrings } from '../strings-handover';

export const handOverStringsDe: typeof handOverStrings = {
  offer: (n: number): string =>
    n === 1
      ? 'Laut Vorrat ist dafür noch 1 Zutat nötig.'
      : `Laut Vorrat sind dafür noch ${n} Zutaten nötig.`,
  offerSome: (n: number, listed: number): string =>
    `Laut Vorrat ${n === 1 ? 'ist' : 'sind'} dafür noch ${n} ${n === 1 ? 'Zutat' : 'Zutaten'} nötig, ${listed} davon wie jetzt gebraucht auf der Einkaufsliste.`,
  offerDone: (n: number): string =>
    n === 1
      ? 'Die 1 Zutat, die laut Vorrat dafür nötig ist, steht auf der Einkaufsliste.'
      : `Die ${n} Zutaten, die laut Vorrat dafür nötig sind, stehen auf der Einkaufsliste.`,
  offerButton: 'Auf die Einkaufsliste',
  loadProblem: 'Das ließ sich nicht öffnen. Bitte noch einmal versuchen.',
  updated: 'Cook’s Workbench wurde aktualisiert. Lade die App neu, um die Einkaufsliste zu nutzen.',
  heading: 'Für die Einkaufsliste',
  linesLabel: 'Was auf die Einkaufsliste kommt',
  freeHeading: 'Nicht im Katalog, ohne Menge',
  space: (name: string): string => `Kommt auf die Einkaufsliste des Raums „${name}“.`,
  notSynced:
    'Die Einkaufsliste ließ sich zuletzt nicht abgleichen. Was daraufkommt, bleibt auf diesem Gerät, bis es wieder geht.',
  confirm: (n: number): string => `${n} auf die Liste setzen`,
  cancel: 'Abbrechen',
  writeRefused:
    'Die Einkaufsliste konnte nicht geschrieben werden. Es wurde nichts auf die Liste gesetzt.',
  summary: (put: number, joined: number, already: number, onlyName?: string): string => {
    if (put === 0)
      return already === 1 && onlyName !== undefined
        ? `${onlyName}: schon auf der Einkaufsliste.`
        : `Alle ${already} standen schon auf der Einkaufsliste.`;
    const into =
      joined === 0
        ? ''
        : joined === put
          ? `, zu ${put === 1 ? 'einem schon vorhandenen Eintrag' : 'schon vorhandenen Einträgen'} hinzugefügt`
          : `, ${joined} davon zu ${joined === 1 ? 'einem schon vorhandenen Eintrag' : 'schon vorhandenen Einträgen'} hinzugefügt`;
    const there =
      already === 0 ? '' : ` ${already} ${already === 1 ? 'stand' : 'standen'} schon darauf.`;
    return `${put} auf die Einkaufsliste gesetzt${into}.${there}`;
  },
  differ: (n: number): string =>
    n === 1
      ? 'Bei 1 davon hat die Liste eine andere Menge, als das Gericht jetzt braucht; die Liste blieb unverändert.'
      : `Bei ${n} davon hat die Liste eine andere Menge, als das Gericht jetzt braucht; die Liste blieb unverändert.`,
  differLabel: 'Mengen auf der Liste und jetzt gebraucht',
  difference: (name: string, listed: string | undefined, asked: string): string =>
    `${name}: auf der Liste ${listed ?? 'ohne Menge'}, jetzt gebraucht ${asked}`,
  open: 'Einkaufsliste öffnen',
  undo: 'Rückgängig',
  undone: (removed: string, restored: string, changed: string, gone: string): string => {
    const parts = [
      removed === '' ? '' : `Von der Liste genommen: ${removed}.`,
      restored === '' ? '' : `Wieder wie vorher, ohne dieses Gericht: ${restored}.`,
      changed === '' ? '' : `Auf der Liste gelassen, seither abgehakt oder geändert: ${changed}.`,
      gone === '' ? '' : `Nicht mehr auf der Liste: ${gone}.`,
    ].filter((p) => p !== '');
    return removed === '' && restored === ''
      ? ['Es wurde nichts zurückgenommen.', ...parts].join(' ')
      : parts.join(' ');
  },
  undoRefused: 'Die Einkaufsliste konnte nicht geschrieben werden. Es wurde nichts zurückgenommen.',
};
