// What the filter's rows offer and say, without a widget: the choices of each list (the web app's
// `offeredBy`, plus a kept choice the dishes no longer offer, so that it can be seen and dropped),
// the names of the choices, the line under a dish, the summary of a closed filter and the heading
// of a group of Cook's list. No `gi://`,
// so Node tests run it; the rows themselves are in `ui/dish-filter.ts`.
import type { Lang } from '@culina/engine';
import {
  characterLabel,
  type DishEntry,
  type DishFilter,
  type ListRow,
  type Offered,
  type RowGroup,
  type Strings,
} from '@culina/app/core';

/** The keys of the filter that a list chooses from. */
export type ListKey = 'character' | 'course' | 'cuisine';

/** The values of each list; the first, `undefined`, is "any". */
export type Choices = Record<ListKey, (string | undefined)[]>;

const withKept = (offered: readonly string[], kept: string | undefined): (string | undefined)[] => [
  undefined,
  ...offered,
  ...(kept !== undefined && !offered.includes(kept) ? [kept] : []),
];

export const choicesOf = (offered: Offered, filter: DishFilter): Choices => ({
  character: withKept(offered.characters, filter.character),
  course: withKept(offered.courses, filter.course),
  cuisine: withKept(offered.cuisines, filter.cuisine),
});

/** The filter with one choice changed; `undefined` or `false` drops it. */
export const withChoice = (
  filter: DishFilter,
  key: keyof DishFilter,
  value: string | true | undefined,
): DishFilter => {
  const next = Object.fromEntries(Object.entries(filter).filter(([k]) => k !== key)) as DishFilter;
  return value === undefined ? next : ({ ...next, [key]: value } as DishFilter);
};

/** The name of a course; a word the app does not know is shown as it is. */
export const courseName = (s: Strings, course: string): string =>
  (s.classics.course as Record<string, string>)[course] ?? course;

/** The name of a cuisine: the country of a code the app knows, else the word as given. */
export const cuisineName = (s: Strings, cuisine: string): string =>
  (s.classics.countries as Record<string, string>)[cuisine] ?? cuisine;

/** The name of a value of a list. */
export const choiceName = (s: Strings, lang: Lang, key: ListKey, value: string): string =>
  key === 'character'
    ? characterLabel(value, lang)
    : key === 'course'
      ? courseName(s, value)
      : cuisineName(s, value);

/** The "any" word of a list. */
export const anyName = (s: Strings, key: ListKey): string =>
  key === 'character'
    ? s.browse.characterAny
    : key === 'course'
      ? s.browse.courseAny
      : s.browse.cuisineAny;

/** What a closed filter says under its title: the choices made, or "Anything". */
export const summaryOf = (s: Strings, lang: Lang, filter: DishFilter): string => {
  const parts = [
    ...(['character', 'course', 'cuisine'] as const).flatMap((key) => {
      const value = filter[key];
      return value === undefined ? [] : [choiceName(s, lang, key, value)];
    }),
    ...(filter.meatFree === true ? [s.browse.meatFree] : []),
    ...(filter.completeOnly === true ? [s.browse.completeOnly] : []),
  ];
  return parts.length === 0 ? s.browse.characterAny : parts.join(' · ');
};

/**
 * The line under a dish in the list: course, cuisine and whether it has meat or fish.
 * @param withCourse - False in a course's group, whose heading says the course.
 */
export const entryLine = (s: Strings, entry: DishEntry, withCourse = true): string =>
  [
    ...(entry.course === undefined || !withCourse ? [] : [courseName(s, entry.course)]),
    ...(entry.cuisine === undefined ? [] : [cuisineName(s, entry.cuisine)]),
    ...(entry.meatFree === undefined
      ? []
      : [entry.meatFree ? s.classics.withoutMeat : s.classics.withMeat]),
  ].join(' · ');

/**
 * The line under a row of Cook's list: as `entryLine`, the course said only where the row still
 * carries it (`groupRows` takes it out of the rows of a course's group, as on the web).
 */
export const rowLine = (s: Strings, row: ListRow): string =>
  entryLine(s, row.entry, row.meta.course !== undefined);

/** The name of a group of Cook's list: "Put together", a course, or "No course given". */
export const groupName = (s: Strings, group: RowGroup): string =>
  group.id === 'frames'
    ? s.browse.groupFrames
    : group.id === 'none'
      ? s.browse.groupNoCourse
      : courseName(s, group.id);

/** The heading of a group with its count, as on the web: "Main course · 37 dishes". */
export const groupTitle = (s: Strings, group: RowGroup): string =>
  `${groupName(s, group)} · ${s.browse.count(group.rows.length)}`;
