// The smallest DOM helpers of the frame: an element with attributes and children, and a drawn
// icon on a 24 px grid. Everything here builds nodes; nothing reads the page.
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

const NS = 'http://www.w3.org/2000/svg';

/** An icon from the path data of a 24 px grid; coloured by the text around it, hidden from readers. */
export function drawIcon(path: string): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'fr-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shape = document.createElementNS(NS, 'path');
  shape.setAttribute('d', path);
  svg.append(shape);
  return svg;
}
