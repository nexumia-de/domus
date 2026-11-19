// A redraw replaces every element, so scroll positions are kept here: a
// list's position per list address (a tap on a row, then Back, returns to the
// same place, also after a reload: session storage), and the detail pane's
// position while its route's path stays the same.

import { type Route } from '../router';

const KEY = 'mixtura.list-scroll';
const memory = new Map<string, number>();
let loaded = false;
let lastDetail = '';
/** The list address of the drawn screen, so its position is saved under the right key. */
let drawnList: string | undefined;

/** The address of a list: destination and its search and filters, not sheets or swaps. */
export function listKey(route: Route): string {
  const query = new URLSearchParams(route.query);
  for (const name of ['sheet', 'swap']) query.delete(name);
  return `${route.path[0] ?? ''}?${query.toString()}`;
}

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, number>;
    for (const [key, value] of Object.entries(saved)) memory.set(key, value);
  } catch {
    // Blocked or damaged: scroll positions are a convenience.
  }
}

function save(): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Same.
  }
}

const visible = (element: HTMLElement | null): element is HTMLElement =>
  element !== null && element.clientHeight > 0;

/** Reads the positions before a redraw; a hidden pane has none to read. */
export function captureScroll(root: HTMLElement): { detail: number } {
  load();
  const list = root.querySelector<HTMLElement>('.pane.list > .pane-scroll');
  if (drawnList !== undefined && visible(list)) {
    memory.set(drawnList, list.scrollTop);
    save();
  }
  const detail = root.querySelector<HTMLElement>('.pane.detail > .pane-scroll');
  return { detail: visible(detail) ? detail.scrollTop : 0 };
}

/** Puts the positions back after a redraw. */
export function restoreScroll(
  root: HTMLElement,
  route: Route,
  captured: { detail: number },
  hasList: boolean,
): void {
  const set = (selector: string, value: number): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element && visible(element)) element.scrollTop = value;
  };
  drawnList = hasList ? listKey(route) : undefined;
  if (drawnList !== undefined) set('.pane.list > .pane-scroll', memory.get(drawnList) ?? 0);
  const key = route.path.join('/');
  if (key === lastDetail) set('.pane.detail > .pane-scroll', captured.detail);
  lastDetail = key;
}
