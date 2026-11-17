// The rows of a list drawn in chunks: the first chunk at once, the next one
// when the "Show more drinks" button nears the screen (or is pressed). 548
// drinks never become 548 rows unless the user scrolls through all of them.
// How many rows a list showed is remembered per list address, so a redraw
// (or Back from a spec) restores the scroll position.

import { h } from '../../dom';
import { strings } from '../../strings';

export const CHUNK = 60;

const shown = new Map<string, number>();

export function incrementalRows<T>(
  items: readonly T[],
  key: string,
  make: (item: T) => HTMLElement,
): HTMLElement[] {
  const list = h('ul', { class: 'rows list-rows' });
  let count = Math.min(items.length, Math.max(CHUNK, shown.get(key) ?? 0));
  const add = (from: number, to: number): void => {
    for (const item of items.slice(from, to)) list.appendChild(make(item));
  };
  add(0, count);
  shown.set(key, count);
  if (count >= items.length) return [list];

  const more = h(
    'button',
    { class: 'btn btn--tonal more-button', type: 'button' },
    strings.browse.showMore,
  );
  const next = (): void => {
    const to = Math.min(items.length, count + CHUNK);
    add(count, to);
    count = to;
    shown.set(key, count);
    if (count >= items.length) more.remove();
    else observer?.observe(more);
  };
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            observer?.unobserve(more);
            next();
          },
          { rootMargin: '600px 0px' },
        );
  more.addEventListener('click', next);
  observer?.observe(more);
  return [list, more];
}
