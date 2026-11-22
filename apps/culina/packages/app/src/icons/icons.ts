/** Own 24 px line icons: 2 px stroke, round caps, currentColor, decorative (the label is visible). */
import type { NavEntry } from '../router';

export type IconName = NavEntry | 'settings';

const PATHS: Record<IconName, string> = {
  // Two dots over two dots: a ratio sign.
  ratios:
    '<circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="17" r="1.5"/><path d="M4 12h5M15 12h5"/>',
  // An open book: the notebook.
  notebook:
    '<path d="M3 5.5h7a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H3zM21 5.5h-7a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h7z"/>',
  // A pot with a lid handle and two curls of steam.
  cook: '<path d="M5 11h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM3 11h2M19 11h2M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/>',
  // A gear with eight teeth and a round hub: Settings.
  settings:
    '<path d="M18.7 10.0 21.3 10.1 21.3 13.9 18.7 14.0 18.2 15.3 19.9 17.3 17.3 19.9 15.3 18.2 14.0 18.7 13.9 21.3 10.1 21.3 10.0 18.7 8.7 18.2 6.7 19.9 4.1 17.3 5.8 15.3 5.3 14.0 2.7 13.9 2.7 10.1 5.3 10.0 5.8 8.7 4.1 6.7 6.7 4.1 8.7 5.8 10.0 5.3 10.1 2.7 13.9 2.7 14.0 5.3 15.3 5.8 17.3 4.1 19.9 6.7 18.2 8.7z"/><circle cx="12" cy="12" r="2.5"/>',
};

const NS = 'http://www.w3.org/2000/svg';

export const icon = (route: IconName): SVGSVGElement => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = PATHS[route];
  return svg;
};
