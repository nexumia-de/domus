// The sort key of a name (docs/rules.md#the-sort-key-of-a-name): the
// same on every device, no locale.

const COMBINING = /[̀-ͯ]/g;

/** "Äpfel" stands with "Apfel"; case, accents and stray spaces do not count. */
export function sortKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING, '')
    .replaceAll('ß', 'ss')
    .replaceAll('ẞ', 'ss')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Compares by code units, as the rules ask; never by the device's locale. */
export const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
