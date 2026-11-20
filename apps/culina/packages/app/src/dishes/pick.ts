// The random pick: one component per role, by chance. It picks within a role and knows nothing
// about what goes together. Pure: the random numbers come in as an argument (the screen passes
// `Math.random`, a test passes fixed numbers), and what is in stock comes in as a question.
import type { Candidate } from './alternatives';

export interface PickOptions {
  /** True: only components that are ready in stock are candidates. */
  onlyStock: boolean;
  /** Whether a made batch of the component is in stock. */
  inStock: (componentId: string) => boolean;
}

export interface RolePick {
  role: string;
  /** Absent when the role has no candidate. */
  choice?: Candidate;
  /** How many candidates the role had. */
  of: number;
}

/** The candidates of one role, in the order given, under the stock option. */
export const candidatesOf = (
  role: string,
  candidates: readonly Candidate[],
  options: PickOptions,
): Candidate[] =>
  candidates.filter((c) => c.role === role && (!options.onlyStock || options.inStock(c.id)));

/**
 * One of the list for a number from 0 (inclusive) to 1 (exclusive): equal shares, in list order.
 * `not` is left out when there is another to take, so rolling again gives something else.
 */
export const pickFrom = (
  list: readonly Candidate[],
  random: number,
  not?: string,
): Candidate | undefined => {
  const others = list.filter((c) => c.id !== not);
  const pool = others.length > 0 ? others : list;
  const share = Number.isFinite(random) ? Math.max(0, random) : 0;
  return pool[Math.min(pool.length - 1, Math.floor(share * pool.length))];
};

/** The pick for one role; `not` is the component the role has now, when it is rolled again. */
export const rollRole = (
  role: string,
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
  not?: string,
): RolePick => {
  const list = candidatesOf(role, candidates, options);
  // A role without a candidate takes no random number.
  const choice = list.length === 0 ? undefined : pickFrom(list, random(), not);
  return { role, ...(choice === undefined ? {} : { choice }), of: list.length };
};

/** One pick per role, in the order of `roles`; each role with a candidate takes one number. */
export const roll = (
  roles: readonly string[],
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
): RolePick[] => roles.map((role) => rollRole(role, candidates, options, random));
