// Which space an app shows when it shows one at a time (Emptio its list,
// Culina its stock). A person can be in several spaces (a household, the
// parents' house); each has its own data. See docs/spaces.md#which-space-an-app-shows.
import { isDeviceOnly } from './device';
import type { StoredSpace } from './store';

export interface SpaceView {
  id: string;
  name: string;
  deviceOnly: boolean;
}

export const viewOf = (space: StoredSpace, unnamed: string): SpaceView => ({
  id: space.id,
  name: space.name?.trim() || unnamed,
  deviceOnly: isDeviceOnly(space),
});

/**
 * The space to show: the one the person chose while it is still there; otherwise the first
 * shared space, unless only a space on this device holds records (data entered before the
 * household was joined is not hidden behind an empty one); otherwise the first space.
 * @param counts The number of the app's live records per space id.
 */
export function pickSpace(
  spaces: readonly SpaceView[],
  choice: string | null,
  counts: ReadonlyMap<string, number>,
): SpaceView | undefined {
  const chosen = spaces.find((space) => space.id === choice);
  if (chosen) return chosen;
  const filled = spaces.filter((space) => (counts.get(space.id) ?? 0) > 0);
  const shared = spaces.find((space) => !space.deviceOnly);
  if (shared && (filled.length === 0 || filled.some((space) => !space.deviceOnly))) {
    return filled.find((space) => !space.deviceOnly) ?? shared;
  }
  return filled[0] ?? spaces[0];
}
