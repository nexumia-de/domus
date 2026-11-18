// The words of a place's state line (docs/ui-strings.md#sync), shared by the
// Sync page and the Places sheet on Stock.

import { type PlaceStatus } from '../../sync/status';
import { needsSetupLink, problemTexts, syncStrings } from './strings';

const t = syncStrings.places;

/** The words of a state line. */
export function statusText(status: PlaceStatus, now: string): string {
  switch (status.kind) {
    case 'synced':
      return t.statuses.synced(status.at, now);
    case 'problem':
      return problemTexts[status.problem];
    default:
      return t.statuses[status.kind];
  }
}

/** Whether to put the setup link after the state line. */
export const statusNeedsLink = (status: PlaceStatus): boolean =>
  status.kind === 'problem' && needsSetupLink(status.problem);
