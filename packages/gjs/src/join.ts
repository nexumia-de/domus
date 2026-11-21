// Joining a space from an invitation link, for a device without the Household
// app: the link carries the storage and the secret, and the access when the
// inviting person included it. The Household app also tests the storage before
// it stores the space; here the first sync cycle says whether it works.
import { deriveSpace, inviteFromFragment, type Store } from '@nexumia-de/hospes';

export type JoinResult =
  | { ok: true; id: string; name?: string }
  | { ok: false; error: 'empty' | 'not-an-invitation' | 'needs-token' | 'already-here' };

/**
 * @param text A pasted link, or its part from the `#` on.
 * @param token The access token, when the invitation carries none (a GitHub storage).
 */
export async function joinByLink(store: Store, text: string, token = ''): Promise<JoinResult> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'empty' };
  const at = trimmed.indexOf('#');
  const parsed = inviteFromFragment(at === -1 ? trimmed : trimmed.slice(at));
  if (!parsed.ok) return { ok: false, error: 'not-an-invitation' };
  const { secret, name, storage, access } = parsed.invite;
  const given = token.trim() === '' ? access : { ...access, token: token.trim() };
  if (storage.type === 'github' && (given?.['token'] ?? '') === '') {
    return { ok: false, error: 'needs-token' };
  }
  let id: string;
  try {
    id = (await deriveSpace(secret)).id;
  } catch {
    return { ok: false, error: 'not-an-invitation' };
  }
  if (await store.getSpace(id)) return { ok: false, error: 'already-here' };
  await store.putSpace({
    id,
    secret,
    ...(name === undefined ? {} : { name }),
    storage: {
      type: storage.type,
      address: storage.address,
      ...(given && Object.keys(given).length > 0 ? { access: given } : {}),
    },
  });
  return { ok: true, id, ...(name === undefined ? {} : { name }) };
}
