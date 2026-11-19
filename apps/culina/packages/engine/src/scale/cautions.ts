// What does not scale linearly. The engine returns flags; it never adjusts
// a time or a salt amount (docs/chef-practice.md#operations).
import type { Caution, ScalableLine } from './types';

/** Default roles that count as salt. */
export const DEFAULT_SALT_ROLES: readonly string[] = ['salt'];

/**
 * The cautions that go with a scaling factor.
 *
 * @param factor - The factor applied.
 * @param lines - The lines scaled, searched for a salt role.
 * @param saltRoles - Roles that count as salt.
 * @returns Nothing for factor 1; otherwise `time-not-linear`, plus `salt-not-linear` when a line has a salt role.
 */
export function cautionsFor(
  factor: number,
  lines: readonly ScalableLine[],
  saltRoles: readonly string[] = DEFAULT_SALT_ROLES,
): Caution[] {
  if (factor === 1) return [];
  const cautions: Caution[] = ['time-not-linear'];
  if (lines.some((line) => line.role !== undefined && saltRoles.includes(line.role))) {
    cautions.push('salt-not-linear');
  }
  return cautions;
}
