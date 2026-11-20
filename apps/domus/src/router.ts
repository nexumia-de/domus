/**
 * Hash router: #/ (home), #/spaces/new, #/spaces/<id>, #/spaces/<id>/invite,
 * #/spaces/<id>/access, #/spaces/<id>/connect and #/join/<data> (the fragment an invite link carries; #/join alone
 * is the same screen without data). The back stack is the browser history.
 */
export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'space'; id: string }
  | { name: 'invite'; id: string }
  | { name: 'access'; id: string }
  | { name: 'connect'; id: string }
  /** `fragment` is the whole hash, for the invite parser; empty when there is no data. */
  | { name: 'join'; fragment: string };

const ID = /^[0-9a-f]{32}$/;

export function parseHash(hash: string): Route {
  const text = hash.startsWith('#') ? hash.slice(1) : hash;
  const parts = text.replace(/^\/+/, '').split('/');
  const [first, second, third] = parts;
  if (first === 'join') {
    return { name: 'join', fragment: parts.length > 1 && parts[1] !== '' ? `#${text}` : '' };
  }
  if (first === 'spaces' && second === 'new' && parts.length === 2) return { name: 'new' };
  if (first === 'spaces' && second !== undefined && ID.test(second)) {
    if (third === undefined && parts.length === 2) return { name: 'space', id: second };
    if (third === 'invite' && parts.length === 3) return { name: 'invite', id: second };
    if (third === 'access' && parts.length === 3) return { name: 'access', id: second };
    if (third === 'connect' && parts.length === 3) return { name: 'connect', id: second };
  }
  return { name: 'home' };
}

export const hashFor = {
  home: '#/',
  new: '#/spaces/new',
  space: (id: string): string => `#/spaces/${id}`,
  invite: (id: string): string => `#/spaces/${id}/invite`,
  access: (id: string): string => `#/spaces/${id}/access`,
  connect: (id: string): string => `#/spaces/${id}/connect`,
};
