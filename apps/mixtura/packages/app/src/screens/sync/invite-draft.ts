// An opened invite link goes into the join draft in memory: the values, or
// the problem text of a link that cannot be used. Nothing is stored, and the
// draft is forgotten when the sheet closes (sheet-drafts.ts).

import { type InviteRead } from '../../sync/invite';
import { drafts, reset } from './drafts';
import { inviteProblemTexts } from './strings';

/** Starts the join draft from an invite: prefilled, or empty with the reason. */
export function fillJoinDraft(read: InviteRead): void {
  reset('join');
  const d = drafts.join;
  if (!read.ok) {
    d.problem = inviteProblemTexts[read.reason];
    return;
  }
  d.folder = read.invite.folder;
  d.code = read.invite.placeCode;
  d.passphrase = read.invite.passphrase;
  d.address = read.invite.address;
}
