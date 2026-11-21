// The random pick: one component per role, by chance. It picks within a role and knows nothing
// about what goes together; asked for a character (or "without meat and fish"), it rolls among the
// combinations that have it, by a bounded search (`rollFitting`). Pure: the random numbers come in
// as an argument (the screen passes `Math.random`, a test passes fixed numbers), what is in stock
// comes in as a question, and so does whether a combination fits (./pick-judge.ts).
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
 * What `same` marks is left out when there is another to take, so rolling again gives something
 * else.
 */
export const pickOne = <T>(
  list: readonly T[],
  random: number,
  same?: (item: T) => boolean,
): T | undefined => {
  const others = same === undefined ? list : list.filter((item) => !same(item));
  const pool = others.length > 0 ? others : list;
  const share = Number.isFinite(random) ? Math.max(0, random) : 0;
  return pool[Math.min(pool.length - 1, Math.floor(share * pool.length))];
};

/** `pickOne` over candidates; `not` is the id of the one to leave out when there is another. */
export const pickFrom = (
  list: readonly Candidate[],
  random: number,
  not?: string,
): Candidate | undefined =>
  pickOne(list, random, not === undefined ? undefined : (c) => c.id === not);

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

/** Whether a combination of picked components (one per role that has a candidate) fits. */
export type Fits = (choices: readonly Candidate[]) => boolean;

/** Up to this many combinations, every one is judged; above, `TRIES` are drawn by chance. */
export const JUDGE_ALL_UP_TO = 200;
/** How many combinations are drawn by chance when there are more than `JUDGE_ALL_UP_TO`. */
export const TRIES = 60;

export type FittingRoll =
  | { found: true; picks: RolePick[] }
  | {
      found: false;
      /** How many combinations the candidates make. */
      combinations: number;
      /** True: every combination was judged; false: `tries` were drawn by chance. */
      all: boolean;
      tries: number;
    };

/** Every combination of one item per list, the first list changing slowest. */
const combinationsOf = (lists: readonly (readonly Candidate[])[]): Candidate[][] =>
  lists.reduce<Candidate[][]>(
    (combos, list) => combos.flatMap((combo) => list.map((c) => [...combo, c])),
    [[]],
  );

/** The picks for a combination; `of` counts the candidates of a role that fit with the others. */
const picksOf = (
  roles: readonly string[],
  lists: readonly (readonly Candidate[])[],
  combo: readonly Candidate[],
  fits: Fits,
): RolePick[] => {
  let next = 0;
  return roles.map((role, i) => {
    const list = lists[i] ?? [];
    if (list.length === 0) return { role, of: 0 };
    const at = next++;
    const choice = combo[at];
    const others = combo.filter((_, j) => j !== at);
    const of = list.filter((c) => fits([...others, c])).length;
    return { role, ...(choice === undefined ? {} : { choice }), of };
  });
};

/**
 * One pick per role among the combinations that fit. The roles with a candidate make the
 * combinations; a role without one stays empty, as in `roll`. With at most `JUDGE_ALL_UP_TO`
 * combinations every one is judged and one of those that fit is taken with one number; with more,
 * up to `TRIES` combinations are drawn (one number per role each) and the first that fits is taken,
 * so "none found" then says only that none of the tries fitted.
 */
export const rollFitting = (
  roles: readonly string[],
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
  fits: Fits,
): FittingRoll => {
  const lists = roles.map((role) => candidatesOf(role, candidates, options));
  const filled = lists.filter((l) => l.length > 0);
  if (filled.length === 0) return { found: true, picks: roles.map((role) => ({ role, of: 0 })) };
  const combinations = filled.reduce((n, l) => n * l.length, 1);
  let combo: Candidate[] | undefined;
  if (combinations <= JUDGE_ALL_UP_TO) {
    combo = pickOne(combinationsOf(filled).filter(fits), random());
    if (combo === undefined) return { found: false, combinations, all: true, tries: combinations };
  } else {
    for (let i = 0; i < TRIES && combo === undefined; i++) {
      const drawn = filled.flatMap((l) => {
        const c = pickFrom(l, random());
        return c === undefined ? [] : [c];
      });
      if (fits(drawn)) combo = drawn;
    }
    if (combo === undefined) return { found: false, combinations, all: false, tries: TRIES };
  }
  return { found: true, picks: picksOf(roles, lists, combo, fits) };
};

/**
 * Rolls one role again among its candidates that fit with the other picks, other than the one it
 * has; the counts of every role are taken again, since they depend on the others.
 */
export const rollRoleFitting = (
  role: string,
  picks: readonly RolePick[],
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
  fits: Fits,
): RolePick[] => {
  const roles = picks.map((p) => p.role);
  const lists = roles.map((r) => candidatesOf(r, candidates, options));
  const others = picks.flatMap((p) =>
    p.role === role || p.choice === undefined ? [] : [p.choice],
  );
  const now = picks.find((p) => p.role === role)?.choice;
  const list = (lists[roles.indexOf(role)] ?? []).filter((c) => fits([...others, c]));
  const choice = list.length === 0 ? now : pickFrom(list, random(), now?.id);
  const combo = picks.flatMap((p) => {
    const c = p.role === role ? choice : p.choice;
    return c === undefined ? [] : [c];
  });
  return picksOf(roles, lists, combo, fits);
};
