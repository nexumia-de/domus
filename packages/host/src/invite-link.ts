// The invite as a link: the invite object as compact JSON, base64url, in the
// URL fragment `#/join/<data>` (the apps are hash routers). A fragment is
// never sent to a server in a request line, so the secret does not reach the
// server that serves the page or a proxy in front of it.
import { buildInvite, parseInvite, type Invite, type InviteError } from '@nexumia-de/materia';
import { base64UrlToBytes, bytesToBase64Url } from './base64url';

const PREFIX = '#/join/';

export type InviteLinkError = InviteError | 'not-a-link' | 'not-json';

export type InviteLinkResult = { ok: true; invite: Invite } | { ok: false; error: InviteLinkError };

/** The fragment (with the leading `#`) for an invite. */
export function inviteToFragment(invite: Invite): string {
  const json = JSON.stringify(buildInvite(invite));
  return PREFIX + bytesToBase64Url(new TextEncoder().encode(json));
}

/**
 * Reads an invite from a fragment, with or without the leading `#`.
 * @returns The invite, or `not-a-link` (other fragment, or data that is not
 * base64url), `not-json`, or the errors of `parseInvite`.
 */
export function inviteFromFragment(fragment: string): InviteLinkResult {
  const text = fragment.startsWith('#') ? fragment : `#${fragment}`;
  if (!text.startsWith(PREFIX)) return { ok: false, error: 'not-a-link' };
  const bytes = base64UrlToBytes(text.slice(PREFIX.length));
  if (!bytes) return { ok: false, error: 'not-a-link' };
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, error: 'not-json' };
  }
  const parsed = parseInvite(value);
  return parsed.ok ? { ok: true, invite: parsed.invite } : { ok: false, error: parsed.error };
}

/**
 * A full link for an invite under a base address; a fragment already on the
 * base is replaced.
 * @param base For example `https://domus.nexumia.de/`.
 */
export function inviteUrl(base: string, invite: Invite): string {
  const hash = base.indexOf('#');
  return (hash === -1 ? base : base.slice(0, hash)) + inviteToFragment(invite);
}
