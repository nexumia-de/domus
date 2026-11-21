// The header of an app: the place on the left (a back arrow on a subpage, then the title of the
// page), the actions of the page on the right. The body starts with content, never repeats the
// title. The apps pass the title and actions of each page; nothing here knows a route.
import { drawIcon, el } from './dom';
import { FRAME_ICONS, type FrameIconName } from './icons';

export interface HeaderPage {
  title: string;
  /** A subpage: the arrow goes there (a hash or a path), labelled for readers. */
  back?: { href: string; label: string };
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

const iconNode = (icon: FrameIconName | SVGSVGElement): SVGSVGElement =>
  typeof icon === 'string' ? drawIcon(FRAME_ICONS[icon]) : icon;

/** An icon-only link of the header: a tooltip and an accessible name, 44 px to touch. */
export function headerLink(
  label: string,
  icon: FrameIconName | SVGSVGElement,
  href: string,
): HTMLAnchorElement {
  return el('a', { class: 'fr-icon-btn', href, 'aria-label': label, title: label }, iconNode(icon));
}

/** An icon-only button of the header. */
export function headerButton(
  label: string,
  icon: FrameIconName | SVGSVGElement,
  run: () => void,
): HTMLButtonElement {
  const button = el(
    'button',
    { class: 'fr-icon-btn', type: 'button', 'aria-label': label, title: label },
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
      const back = page.back ? [headerLink(page.back.label, 'back', page.back.href)] : [];
      node.replaceChildren(...back, place, actions);
      actions.replaceChildren(...(page.actions ?? []));
    },
  };
}
