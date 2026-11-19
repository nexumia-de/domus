// Tells a screen when the route has moved away from it (`Screen.leave`).

import { type Screen } from '../screen';

let shown: Screen | null = null;

/** Called with the screen of every draw; runs `leave` of the one that was shown before. */
export function trackLeave(screen: Screen | null): void {
  const before = shown;
  shown = screen;
  if (before && before !== screen) before.leave?.();
}
