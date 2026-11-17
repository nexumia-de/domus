// Tiny helpers to build DOM. Text always goes in as a text node, never as
// markup, so user text cannot inject HTML.

export type Child = Node | string | null | undefined | false;
type Prop = string | number | boolean | undefined | ((event: Event) => void);
export type Props = Record<string, Prop>;

function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Builds an element. `class` sets the class list, `onclick` and the like add listeners. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') element.addEventListener(name.slice(2), value);
    else if (name === 'class') element.className = String(value);
    else element.setAttribute(name, value === true ? '' : String(value));
  }
  append(element, children);
  return element;
}

const SVG = 'http://www.w3.org/2000/svg';

/** A 24 px line icon from SVG elements given as [tag, attributes]. */
export function icon(shapes: readonly (readonly [string, Record<string, string>])[]): SVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'i');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attributes] of shapes) {
    const shape = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
    svg.appendChild(shape);
  }
  return svg;
}
