// The small line icons of the browse screens, from the mock-ups. Each call
// makes a new element; icons are decoration and always aria-hidden.

import { icon } from '../dom';

type Shapes = Parameters<typeof icon>[0];

const make = (shapes: Shapes) => (): SVGElement => icon(shapes);

export const search = make([
  ['circle', { cx: '11', cy: '11', r: '6' }],
  ['path', { d: 'M16 16l5 5' }],
]);
export const filter = make([['path', { d: 'M4 6h16M7 12h10M10 18h4' }]]);
export const close = make([['path', { d: 'M6 6l12 12M18 6L6 18' }]]);
export const plus = make([['path', { d: 'M12 5v14M5 12h14' }]]);
export const check = make([['path', { d: 'M5 12l5 5 9-10' }]]);
export const chevron = make([['path', { d: 'M9 5l7 7-7 7' }]]);
export const swap = make([['path', { d: 'M4 8h14l-3-3M20 16H6l3 3' }]]);
export const riff = make([
  ['circle', { cx: '6', cy: '5', r: '2' }],
  ['circle', { cx: '6', cy: '19', r: '2' }],
  ['circle', { cx: '18', cy: '9', r: '2' }],
  ['path', { d: 'M6 7v10M18 11c0 4-6 3-12 6' }],
]);
export const edit = make([['path', { d: 'M4 20l1-4L16 5l3 3L8 19z' }]]);
/** Within a range: a filled circle. */
export const within = make([['circle', { cx: '12', cy: '12', r: '5', fill: 'currentColor' }]]);
export const below = make([['path', { d: 'M12 5v14M6 13l6 6 6-6' }]]);
export const above = make([['path', { d: 'M12 19V5M6 11l6-6 6 6' }]]);
/** No figure: a dash. */
export const none = make([['path', { d: 'M7 12h10' }]]);
/** Three dots, vertical: the line menu. */
export const more = make([
  ['circle', { cx: '12', cy: '5', r: '1.5', fill: 'currentColor' }],
  ['circle', { cx: '12', cy: '12', r: '1.5', fill: 'currentColor' }],
  ['circle', { cx: '12', cy: '19', r: '1.5', fill: 'currentColor' }],
]);
/** Two rows of dots: the drag handle. */
export const grip = make([['path', { d: 'M8 7h8M8 12h8M8 17h8' }]]);
export const back = make([['path', { d: 'M15 5l-7 7 7 7' }]]);
/** Two arrows, one up and one down: the sort menu. */
export const sort = make([['path', { d: 'M7 19V5M4 8l3-3 3 3M17 5v14M14 16l3 3 3-3' }]]);
export const share = make([
  ['circle', { cx: '6', cy: '12', r: '2.5' }],
  ['circle', { cx: '17', cy: '6', r: '2.5' }],
  ['circle', { cx: '17', cy: '18', r: '2.5' }],
  ['path', { d: 'M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6' }],
]);
// Ratings (docs/ratings.md): favourite, good, not for me.
export const heart = make([
  ['path', { d: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z' }],
]);
const THUMB =
  'M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2 3l-1 3h5.5c1.2 0 2 1 1.7 2.2l-1.5 6c-.3 1-1 1.8-2.2 1.8H7';
export const thumbUp = make([['path', { d: THUMB }]]);
export const thumbDown = make([['path', { d: THUMB, transform: 'rotate(180 12 12)' }]]);
