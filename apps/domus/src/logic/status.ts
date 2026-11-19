// The state of a space's last cycle, derived from what is stored (`syncedAt` of the `space`
// collection) and the last failure this page saw. A failure is kept in memory only: it is
// a statement about now, and a reload starts without it.
import type { Strings } from '../strings';
import type { Problem } from './failures';

export type SpaceState =
  | { kind: 'never' }
  | { kind: 'in-step'; at: string }
  | { kind: 'failed'; problem: Problem; at: string };

export interface LastFailure {
  at: string;
  problem: Problem;
}

/** A failure newer than the last good cycle wins; otherwise the last good cycle, else never. */
export function spaceState(
  syncedAt: string | undefined,
  last: LastFailure | undefined,
): SpaceState {
  if (last && (syncedAt === undefined || last.at >= syncedAt)) {
    return { kind: 'failed', problem: last.problem, at: last.at };
  }
  return syncedAt === undefined ? { kind: 'never' } : { kind: 'in-step', at: syncedAt };
}

/** "just now", "5 min ago", "3 h ago", then the date. */
export function ago(t: Strings, at: string, now: string): string {
  const minutes = Math.floor((Date.parse(now) - Date.parse(at)) / 60_000);
  if (!(minutes >= 1)) return t.time.justNow;
  if (minutes < 60) return t.time.minutes(minutes);
  if (minutes < 24 * 60) return t.time.hours(Math.floor(minutes / 60));
  return at.slice(0, 10);
}

const failures = new Map<string, LastFailure>();
export const lastFailure = (id: string): LastFailure | undefined => failures.get(id);
export const noteFailure = (id: string, at: string, problem: Problem): void => {
  failures.set(id, { at, problem });
};
export const clearFailure = (id: string): void => {
  failures.delete(id);
};
