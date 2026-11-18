/** Own 24 px line icons: 2 px stroke, round caps, currentColor, decorative (the label is visible). */
import type { Route } from '../router';

const PATHS: Record<Route, string> = {
  // Two dots over two dots: a ratio sign.
  ratios:
    '<circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="17" r="1.5"/><path d="M4 12h5M15 12h5"/>',
  // Three stacked layers.
  components: '<path d="M4 6h16v3H4zM4 11h16v3H4zM4 16h16v3H4z"/>',
  // A plate: rim and well.
  dishes: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  // A shelf with a jar on it.
  stock:
    '<path d="M4 20h16M5 20V6h14v14M5 13h14"/><circle cx="10" cy="9.5" r="1.5"/><circle cx="14" cy="16.5" r="1.5"/>',
  // Two sliders.
  settings:
    '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
};

const NS = 'http://www.w3.org/2000/svg';

export const icon = (route: Route): SVGSVGElement => {
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
