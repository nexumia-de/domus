// The invite link: `<app address>#/join/<payload>`, the payload coded like
// the share-a-drink link (share/link.ts) from the invite text. Reading is
// untrusted input, so the payload and the decompressed text are capped.
// Docs: docs/screens-sync.md#invite-link.

import { decodePayload, encodePayload } from '../share/link';
import { inviteText, MAX_INVITE_CHARS, readInvite, type InviteRead } from './invite';
import type { ShareValues } from './share-values';

/** The route a link opens; the payload follows. */
export const JOIN_ROUTE = 'join';
/** Longest payload read, in characters. */
const MAX_PAYLOAD = 8000;

/** The link for the values of a shared place; `appAddress` is the app's address without the hash. */
export async function makeInviteLink(values: ShareValues, appAddress: string): Promise<string> {
  return `${appAddress}#/${JOIN_ROUTE}/${await encodePayload(inviteText(values))}`;
}

/** The values in a payload (what follows `#/join/`), or why it is refused; never throws. */
export async function readInviteLink(payload: string): Promise<InviteRead> {
  if (payload.length > MAX_PAYLOAD) return { ok: false, reason: 'damaged' };
  const decoded = await decodePayload(payload, MAX_INVITE_CHARS * 4);
  if (!decoded.ok)
    return { ok: false, reason: decoded.reason === 'version' ? 'version' : 'damaged' };
  return readInvite(decoded.text);
}
