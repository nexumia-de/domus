// The groups of Cook's list in the order by name (docs/behaviour.md, Cook): first the frames, the
// app's own compositions (tacos, ramen, pizza), then the other dishes by course in a cook's order,
// main courses first, then the dishes that state no course. The order within a group is the order
// the rows come in (by name, from `dishListView`). Pure: no DOM and no texts; the screen names the
// groups (screens/dish-list.ts, and the native app's Cook page in packages/linux).
import type { Course } from '@culina/engine';
import type { ListRow, RowMeta } from './list-view';

/**
 * The courses in the order of the groups: what a cook looks for first, a main course, then what
 * goes with it or before it, then the rest of the day and the sweet things. A judgement of the
 * agent, not tested with a cook. Every course of the engine's `COURSE_IDS` is here once.
 */
export const GROUP_COURSES: readonly Course[] = [
  'main',
  'soup',
  'starter',
  'side',
  'sauce',
  'breakfast',
  'snack',
  'dessert',
  'baking',
];

/** A group: the frames, one course, or the dishes without a course. */
export type GroupId = 'frames' | Course | 'none';

export interface RowGroup {
  id: GroupId;
  rows: ListRow[];
}

const groupOf = (row: ListRow): GroupId =>
  row.entry.frame === true ? 'frames' : (row.entry.course ?? 'none');

const withoutCourse = (meta: RowMeta): RowMeta => {
  const rest = { ...meta };
  delete rest.course;
  return rest;
};

/** Every group in the order of the list; the empty ones too, so that the order is one place. */
const ORDER: readonly GroupId[] = ['frames', ...GROUP_COURSES, 'none'];

/**
 * The rows in groups, or undefined where the list stays one flat list: fewer than two groups would
 * be left (a heading would only repeat what the filter or the count line says). An empty group is
 * left out. In a course group the line under a name no longer says the course: the heading says it
 * (as the origin is said only while both origins are shown); in the frames group it still does.
 *
 * @param rows - The rows in the order by name. The caller does not group the order "Use up first":
 *   there the order itself is the answer.
 */
export const groupRows = (rows: readonly ListRow[]): RowGroup[] | undefined => {
  const byGroup = new Map<GroupId, ListRow[]>();
  for (const row of rows) {
    const id = groupOf(row);
    const list = byGroup.get(id);
    if (list === undefined) byGroup.set(id, [row]);
    else list.push(row);
  }
  if (byGroup.size < 2) return undefined;
  return ORDER.flatMap((id): RowGroup[] => {
    const list = byGroup.get(id);
    if (list === undefined) return [];
    if (id === 'frames' || id === 'none') return [{ id, rows: list }];
    return [{ id, rows: list.map(({ entry, meta }) => ({ entry, meta: withoutCourse(meta) })) }];
  });
};
