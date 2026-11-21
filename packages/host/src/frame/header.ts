// The header of an app: the place on the left (a back arrow on a subpage, then the title of the
// page), the actions of the page on the right. The body starts with content, never repeats the
// title. The apps pass the title and actions of each page; nothing here knows a route.
import { drawIcon, el } from './dom';
import { FRAME_ICONS, type FrameIconName } from './icons';

export interface HeaderPage {
  title: string;
  /**
   * A subpage: the arrow goes there (a hash or a path) or runs `run` (an app with its own
   * history); labelled for readers. `attrs` are put on the button, for example a focus key.
   */
  back?: { label: string; attrs?: HeaderAttrs } & ({ href: string } | { run: () => void });
  /** Under the title, small: for example the shown space. */
  subtitle?: Node;
  /** Right-hand side, in order: `headerLink`, `headerButton` or the sync button. */
  actions?: readonly Node[];
}

export interface FrameHeader {
  node: HTMLElement;
  /** The page's one `h1`. */
  heading: HTMLElement;
  show(page: HeaderPage): void;
}

/** Extra attributes of a header action (a focus key, a test id); the apps decide which. */
export type HeaderAttrs = Record<string, string>;

/** An own icon by name, or an icon the app drew (it gets the frame's icon class). */
const iconNode = (icon: FrameIconName | SVGElement): SVGElement => {
  if (typeof icon === 'string') return drawIcon(FRAME_ICONS[icon]);
  icon.classList.add('fr-icon');
  return icon;
};

/** An icon-only link of the header: a tooltip and an accessible name, 44 px to touch. */
export function headerLink(
  label: string,
  icon: FrameIconName | SVGElement,
  href: string,
  attrs: HeaderAttrs = {},
): HTMLAnchorElement {
  return el(
    'a',
    { class: 'fr-icon-btn', href, 'aria-label': label, title: label, ...attrs },
    iconNode(icon),
  );
}

/** An icon-only button of the header. */
export function headerButton(
  label: string,
  icon: FrameIconName | SVGElement,
  run: () => void,
  attrs: HeaderAttrs = {},
): HTMLButtonElement {
  const button = el(
    'button',
    { class: 'fr-icon-btn', type: 'button', 'aria-label': label, title: label, ...attrs },
    iconNode(icon),
  );
  button.addEventListener('click', run);
  return button;
}

export function createHeader(): FrameHeader {
  const heading = el('h1', { class: 'fr-title' });
  const subtitle = el('div', { class: 'fr-subtitle' });
  const place = el('div', { class: 'fr-place' }, heading, subtitle);
  const actions = el('div', { class: 'fr-actions' });
  const node = el('header', { class: 'fr-header' }, place, actions);
  return {
    node,
    heading,
    show(page) {
      heading.textContent = page.title;
      subtitle.replaceChildren(...(page.subtitle ? [page.subtitle] : []));
      subtitle.hidden = page.subtitle === undefined;
      const { back: to } = page;
      const back = !to
        ? []
        : 'run' in to
          ? [headerButton(to.label, 'back', to.run, to.attrs)]
          : [headerLink(to.label, 'back', to.href, to.attrs)];
      node.replaceChildren(...back, place, actions);
      actions.replaceChildren(...(page.actions ?? []));
    },
  };
}
