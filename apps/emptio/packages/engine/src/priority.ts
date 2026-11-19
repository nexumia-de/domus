/** The three steps of an entry's priority, most pressing first. */
export const PRIORITIES = ['now', 'soon', 'sometime'] as const;

export type Priority = (typeof PRIORITIES)[number];

/** The priority a new entry gets when none is given. */
export const DEFAULT_PRIORITY: Priority = 'soon';

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value);
}
