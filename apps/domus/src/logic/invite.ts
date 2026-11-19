// The invite a space makes, and the invite a pasted link or fragment gives back.
import { INVITE_FORMAT, INVITE_VERSION, type Invite } from '@nexumia-de/materia';
import {
  inviteFromFragment,
  inviteUrl,
  type InviteLinkError,
  type StoredSpace,
} from '@nexumia-de/hospes';
import { isKind, validAddress } from './storage';

/**
 * The invite of a space. The storage access (a token, a user name and password) is in it only
 * when `includeAccess` is true and the space has some; the secret always is.
 */
export function inviteOf(space: StoredSpace, includeAccess: boolean): Invite {
  const { type, address, access } = space.storage;
  return {
    format: INVITE_FORMAT,
    version: INVITE_VERSION,
    secret: space.secret,
    ...(space.name === undefined ? {} : { name: space.name }),
    storage: { type, address },
    ...(includeAccess && access !== undefined && Object.keys(access).length > 0
      ? { access: { ...access } }
      : {}),
  };
}

/** The link to hand over: `base` is this page's address without a fragment. */
export const inviteLink = (base: string, space: StoredSpace, includeAccess: boolean): string =>
  inviteUrl(base, inviteOf(space, includeAccess));

export type JoinError = InviteLinkError | 'empty' | 'unknown-storage' | 'bad-address';

export type Parsed = { ok: true; invite: Invite } | { ok: false; error: JoinError };

/** The part of a pasted text that is the route: after the first `#`, or the text itself. */
export const fragmentOf = (text: string): string => {
  const trimmed = text.trim();
  const at = trimmed.indexOf('#');
  return at === -1 ? trimmed : trimmed.slice(at);
};

/** Reads a pasted link, a bare `#/join/…` or the fragment of the address bar. */
export function parseInviteText(text: string): Parsed {
  if (text.trim() === '') return { ok: false, error: 'empty' };
  const result = inviteFromFragment(fragmentOf(text));
  if (!result.ok) return result;
  const { storage } = result.invite;
  if (!isKind(storage.type)) return { ok: false, error: 'unknown-storage' };
  if (!validAddress(storage.type, storage.address)) return { ok: false, error: 'bad-address' };
  return result;
}

/** Whether the person has to enter the access: the invite carries none that this storage needs. */
export function needsAccess(invite: Invite): boolean {
  const { access, storage } = invite;
  if (storage.type === 'github') return access?.token === undefined || access.token === '';
  return access === undefined;
}
