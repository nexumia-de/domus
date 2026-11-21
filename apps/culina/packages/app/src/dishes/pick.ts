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

/** A combination: the picked component of each role that has one, keyed by the role. */
export type Chosen = ReadonlyMap<string, Candidate>;

/** Every combination of one candidate per role, the first role changing slowest. */
const combinationsOf = (
  lists: readonly { role: string; list: readonly Candidate[] }[],
): Map<string, Candidate>[] =>
  lists.reduce<Map<string, Candidate>[]>(
    (combos, { role, list }) =>
      combos.flatMap((combo) => list.map((c) => new Map([...combo, [role, c]]))),
    [new Map()],
  );

/** The components of a combination other than the one of `role`. */
const othersOf = (chosen: Chosen, role: string): Candidate[] =>
  [...chosen].flatMap(([r, c]) => (r === role ? [] : [c]));

/**
 * The picks for a combination, each role reading its own choice by its name, never by position.
 * `of` counts the candidates of a role (under the options now) that fit with the other choices.
 */
const picksOf = (
  roles: readonly string[],
  options: PickOptions,
  candidates: readonly Candidate[],
  chosen: Chosen,
  fits: Fits,
): RolePick[] =>
  roles.map((role) => {
    const choice = chosen.get(role);
    const others = othersOf(chosen, role);
    const of = candidatesOf(role, candidates, options).filter((c) => fits([...others, c])).length;
    return { role, ...(choice === undefined ? {} : { choice }), of };
  });

/**
 * One pick per role among the combinations that fit. The roles with a candidate make the
 * combinations; a role without one stays empty, as in `roll`. With at most `JUDGE_ALL_UP_TO`
 * combinations every one is judged and one of those that fit is taken with one number; with more,
 * up to `TRIES` combinations are drawn (one number per role each) and the first that fits is taken,
 * so "none found" then says only that none of the tries fitted. The draw is even over the
 * combinations that fit, not over the candidates of a role.
 */
export const rollFitting = (
  roles: readonly string[],
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
  fits: Fits,
): FittingRoll => {
  const filled = roles
    .map((role) => ({ role, list: candidatesOf(role, candidates, options) }))
    .filter((r) => r.list.length > 0);
  if (filled.length === 0) return { found: true, picks: roles.map((role) => ({ role, of: 0 })) };
  const combinations = filled.reduce((n, r) => n * r.list.length, 1);
  const judge = (chosen: Chosen): boolean => fits([...chosen.values()]);
  let chosen: Chosen | undefined;
  if (combinations <= JUDGE_ALL_UP_TO) {
    chosen = pickOne(combinationsOf(filled).filter(judge), random());
    if (chosen === undefined) return { found: false, combinations, all: true, tries: combinations };
  } else {
    for (let i = 0; i < TRIES && chosen === undefined; i++) {
      const drawn = new Map<string, Candidate>();
      for (const { role, list } of filled) {
        const c = pickFrom(list, random());
        if (c !== undefined) drawn.set(role, c);
      }
      if (judge(drawn)) chosen = drawn;
    }
    if (chosen === undefined) return { found: false, combinations, all: false, tries: TRIES };
  }
  return { found: true, picks: picksOf(roles, options, candidates, chosen, fits) };
};

/**
 * Rolls one role again among its candidates (under the options now) that fit with the other
 * picks, other than the one it has. The other roles keep their choices, each read by its role;
 * when the role has no candidate that fits, it keeps its own. The counts of every role are taken
 * again, since they depend on the others.
 */
export const rollRoleFitting = (
  role: string,
  picks: readonly RolePick[],
  candidates: readonly Candidate[],
  options: PickOptions,
  random: () => number,
  fits: Fits,
): RolePick[] => {
  const chosen = new Map(
    picks.flatMap((p) => (p.choice === undefined ? [] : [[p.role, p.choice] as const])),
  );
  const now = chosen.get(role);
  const others = othersOf(chosen, role);
  const list = candidatesOf(role, candidates, options).filter((c) => fits([...others, c]));
  const choice = list.length === 0 ? now : pickFrom(list, random(), now?.id);
  if (choice !== undefined) chosen.set(role, choice);
  return picksOf(
    picks.map((p) => p.role),
    options,
    candidates,
    chosen,
    fits,
  );
};
