/** Hash router: #/ (the list), #/entry/<id>, #/categories, #/settings. */
export type Route =
  { name: 'list' } | { name: 'entry'; id: string } | { name: 'categories' } | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#?\/*/, '').split('/');
  const [first, second] = parts;
  if (first === 'entry' && second !== undefined && second !== '' && parts.length === 2) {
    return { name: 'entry', id: decodeURIComponent(second) };
  }
  if (first === 'categories' && parts.length === 1) return { name: 'categories' };
  if (first === 'settings' && parts.length === 1) return { name: 'settings' };
  return { name: 'list' };
}

export const hashFor = {
  list: '#/',
  entry: (id: string): string => `#/entry/${encodeURIComponent(id)}`,
  categories: '#/categories',
  settings: '#/settings',
};
