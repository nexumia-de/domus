/** An element with attributes and children; `false`, `null` and `undefined` are left out. */
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
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

/** A button that runs `action` on a click. */
export function button(label: string, action: () => void, attrs: Attrs = {}): HTMLButtonElement {
  const node = h('button', { type: 'button', ...attrs }, label);
  node.addEventListener('click', action);
  return node;
}
