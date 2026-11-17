// Text for searching: lower case without accents, so "Apéritif" is found by
// "aperitif" and "Crème" by "creme".

export function normalise(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
