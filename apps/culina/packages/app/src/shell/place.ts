// The place on a screen, kept for the way back (docs/behaviour.md, Navigation). A screen reached
// forward starts at its top with its heading focused; a screen reached again through the history
// (the browser's back or forward, "Back to the list") stands where it was left, with the focus on
// the link the user left it by. The place lives in memory for the page, keyed by an id the shell
// writes into the history entry's state; nothing is stored. Pure: the DOM is read by shell.ts.

/** Where a screen was left: the page's scroll and the link that was followed, if any. */
export interface Place {
  /** `window.scrollY` when the screen was left. */
  y: number;
  /** The link followed out of the screen: its `href` attribute and its top in the page. */
  link?: { href: string; top: number };
}

/** A link of the screen drawn again: its `href` attribute and its top in the page. */
export interface LinkSpot {
  href: string;
  top: number;
}

/**
 * The link to focus on the way back: the one with the same `href` (the nearest to where it stood
 * when there are several); when it is gone (the list changed), the link that now stands nearest to
 * where it stood. Undefined when nothing was followed or there is no link at all.
 */
export const linkToFocus = (place: Place, links: readonly LinkSpot[]): number | undefined => {
  const { link } = place;
  if (link === undefined) return undefined;
  const nearest = (indices: readonly number[]): number | undefined => {
    let best: number | undefined;
    for (const i of indices) {
      const spot = links[i];
      const kept = best === undefined ? undefined : links[best];
      if (spot === undefined) continue;
      if (kept === undefined || Math.abs(spot.top - link.top) < Math.abs(kept.top - link.top))
        best = i;
    }
    return best;
  };
  const all = links.map((_, i) => i);
  const same = all.filter((i) => links[i]?.href === link.href);
  return nearest(same.length > 0 ? same : all);
};

/** The part of the window not covered by the sticky header and the bottom bar, in its coordinates. */
export interface Band {
  top: number;
  bottom: number;
}

/**
 * The scroll that shows the place: `y` as it was, unless the link to focus (its top and height in
 * the page) would then stand outside the band; then the scroll that puts it in the middle of the
 * band. Never below 0 (the browser clamps the bottom end).
 */
export const scrollFor = (
  y: number,
  target: { top: number; height: number } | undefined,
  band: Band,
): number => {
  const clamp = (value: number): number => Math.max(0, Math.round(value));
  if (target === undefined) return clamp(y);
  const top = target.top - y;
  if (top >= band.top && top + target.height <= band.bottom) return clamp(y);
  const middle = (band.top + band.bottom) / 2;
  return clamp(target.top + target.height / 2 - middle);
};

/** The key the shell writes into a history entry's state. */
export const PLACE_KEY = 'culinaScreen';

/** The id a history entry's state carries, if any. */
export const entryOf = (state: unknown): string | undefined => {
  if (state === null || typeof state !== 'object') return undefined;
  const id: unknown = (state as Record<string, unknown>)[PLACE_KEY];
  return typeof id === 'string' ? id : undefined;
};

/** The state with the id added, keeping what else it holds (list-return.ts's mark). */
export const withEntry = (state: unknown, id: string): Record<string, unknown> => ({
  ...(state !== null && typeof state === 'object' ? (state as Record<string, unknown>) : {}),
  [PLACE_KEY]: id,
});
