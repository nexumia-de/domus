/**
 * The `updatedAt` of a new write. Rule: the later of `now()` and the stored value plus one
 * millisecond, so a write is always strictly newer than the row it replaces, even when the
 * device clock went backwards.
 */
export const nextUpdatedAt = (now: () => string, stored?: string): string => {
  const current = Date.parse(now());
  if (Number.isNaN(current)) throw new Error('the store clock returned no valid instant');
  const previous = stored === undefined ? Number.NEGATIVE_INFINITY : Date.parse(stored);
  const next = Number.isNaN(previous) ? current : Math.max(current, previous + 1);
  return new Date(next).toISOString();
};
