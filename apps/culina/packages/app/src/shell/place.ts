// The place on a screen, kept for the way back (docs/behaviour.md, Navigation). A screen reached
// forward starts at its top with its heading focused; a screen reached again through the history
// (the browser's back or forward, "Back to the list") stands where it was left, with the focus on
// the link the user left it by; left another way (the navigation, a button, the browser's back or
// forward), on the heading when it is in view, else on the link it was left by earlier when that
// is in view, else on the first link (button, summary) in view. The place lives in memory for the
// page, keyed by an id the shell writes into the history entry's state; nothing is stored. Pure:
// the DOM is read by shell.ts.

/** Where a screen was left: the page's scroll and the link that was followed, if any. */
export interface Place {
  /** `window.scrollY` when the screen was left. */
  y: number;
  /** True when the screen was left by following `link`; false when `link` was followed earlier. */
  followed: boolean;
  /** The link followed out of the screen: its `href` attribute and its top in the page. */
  link?: { href: string; top: number };
}

/**
 * A link (or a button or summary, `href` empty) of the screen drawn again: its `href` attribute,
 * its top in the page and its height.
 */
export interface LinkSpot {
  href: string;
  top: number;
  height?: number;
}

/** A box on the screen, in the window's coordinates. */
export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
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
  // A button or summary (no href) stands in for a gone link only where no link is left.
  const all = links.map((_, i) => i);
  const anchors = all.filter((i) => links[i]?.href !== '');
  const same = all.filter((i) => links[i]?.href === link.href);
  return nearest(same.length > 0 ? same : anchors.length > 0 ? anchors : all);
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

/**
 * The band of the window in which main is not covered: below the sticky header and above the
 * bottom bar where they stand over main (at 360 px); from 720 px the header and the rail are a
 * column beside main and cover none of it.
 */
export const bandOf = (main: Box, header: Box, nav: Box, height: number): Band => {
  const over = (box: Box): boolean => box.right > main.left + 1 && box.left < main.right - 1;
  return {
    top: over(header) ? Math.max(0, header.bottom) : 0,
    bottom: over(nav) && nav.top > height / 2 ? nav.top : height,
  };
};

/** The scroll to show and what takes the focus: a link (its index) or the heading. */
export interface Restore {
  y: number;
  focus: number | 'heading';
}

/**
 * Where a screen reached again through the history stands, and what has the focus. Left by a link:
 * that link (or, gone, the nearest), scrolled into the band when the old scroll would hide it.
 * Left another way: the old scroll as it was, and the focus on the first of the heading, the link
 * followed earlier and the first link that stand in the band at that scroll, so that the next Tab
 * goes on from where the user looks, not from the top of the page; the heading when none does.
 */
export const restoreTarget = (
  place: Place,
  links: readonly LinkSpot[],
  heading: { top: number; height: number } | undefined,
  band: Band,
  maxY: number,
): Restore => {
  const clampY = (value: number): number =>
    Math.min(Math.max(0, Math.round(value)), Math.max(0, Math.round(maxY)));
  const shows = (spot: { top: number; height?: number }, y: number): boolean =>
    spot.top - y >= band.top - 1 && spot.top + (spot.height ?? 0) - y <= band.bottom + 1;
  const index = linkToFocus(place, links);
  const spot = index === undefined ? undefined : links[index];
  if (place.followed && index !== undefined && spot !== undefined)
    return {
      y: clampY(scrollFor(place.y, { top: spot.top, height: spot.height ?? 0 }, band)),
      focus: index,
    };
  const y = clampY(place.y);
  if (heading !== undefined && shows(heading, y)) return { y, focus: 'heading' };
  if (index !== undefined && spot !== undefined && shows(spot, y)) return { y, focus: index };
  const first = [
    links.findIndex((link) => link.href !== '' && shows(link, y)),
    links.findIndex((link) => shows(link, y)),
  ].find((i) => i >= 0);
  return { y, focus: first ?? 'heading' };
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
