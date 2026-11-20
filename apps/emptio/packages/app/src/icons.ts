// The few drawn signs of the frame: own line drawings on a 24 px grid, coloured by the text
// around them. An icon never stands alone; its label is beside it or on its link.
const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  categories: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 5v4M7 15v4M15 7a2 2 0 1 0 0 .01M9 17a2 2 0 1 0 0 .01',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.append(path);
  return svg;
}
