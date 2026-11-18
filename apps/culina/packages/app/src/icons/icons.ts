/** Own 24 px line icons: 2 px stroke, round caps, currentColor, decorative (the label is visible). */
import type { NavEntry } from '../router';

const PATHS: Record<NavEntry, string> = {
  // Two dots over two dots: a ratio sign.
  ratios:
    '<circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="17" r="1.5"/><path d="M4 12h5M15 12h5"/>',
  // Three stacked layers.
  components: '<path d="M4 6h16v3H4zM4 11h16v3H4zM4 16h16v3H4z"/>',
  // A plate: rim and well.
  dishes: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  // A pot with a lid handle and two curls of steam.
  cook: '<path d="M5 11h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM3 11h2M19 11h2M9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5"/>',
  // Two sliders.
  settings:
    '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
};

const NS = 'http://www.w3.org/2000/svg';

export const icon = (route: NavEntry): SVGSVGElement => {
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
