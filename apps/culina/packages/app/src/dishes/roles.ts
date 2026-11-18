// The roles a dish is asked to fill. A role no slot has is an open slot, shown as an invitation.
// Starch is often there but not always: it is never invited.
import { roleInvite } from '../components/names';
import { strings } from '../strings';

export const DISH_ROLES = ['main', 'sauce', 'crunch', 'acid', 'garnish'] as const;

/** The roles of `DISH_ROLES` that none of the slot roles covers, in that order. */
export const openRoles = (slotRoles: readonly string[]): string[] =>
  DISH_ROLES.filter((role) => !slotRoles.includes(role));

/** "Open: add a crunch". */
export const inviteText = (role: string): string => strings.dishes.openSlot(roleInvite(role));
