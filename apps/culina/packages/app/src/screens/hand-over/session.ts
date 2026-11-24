// What the hand-over on a dish's page keeps while that screen is shown: whether the confirmation
// is open, the lines the cook ticked or unticked, what this page put on the list and the Undo of
// it, the message, and where the focus goes after the next draw. The notebook draws the whole
// screen again on every change (the write itself is one), so this lives outside the elements. It
// lives for one screen shown by the shell (`screenShown`): a redraw keeps it, a change of screen
// (a link, Back, another dish) starts a new one, whatever order the listeners run in. A reload
// starts the page anew and forgets it too.
import type { ListUndo } from '../../shared-list/hand-over';
import { pointerLast, screenShown } from '../../shell/shell';

/** One hand-over of this page that wrote something, for Undo. */
export interface HandOverWrite {
  undo: ListUndo;
  /** Per entry written (its id), the line's name. */
  names: Map<string, string>;
  /** Per entry written (its id), the line's key (`HandOverSession.handed`). */
  keys: Map<string, string>;
}

export interface HandOverResult {
  /** The sentence in the status line. */
  text: string;
  /** Lines whose amount on the list differs from the one the dish asks now, outside the status. */
  differences: string[];
}

export interface HandOverSession {
  open: boolean;
  busy: boolean;
  /** The cook's own ticks, by line key (an ingredient id, or `free:` and a name). */
  choice: Map<string, boolean>;
  /** The line keys this page put on the list (or found there) and did not take back. */
  handed: Set<string>;
  /** Per handed key, the amount it was handed with ("" for none): other portions differ. */
  handedAt: Map<string, string>;
  /** The hand-overs of this page that wrote something and were not taken back, oldest first. */
  writes: HandOverWrite[];
  result?: HandOverResult;
  /** A word under the offer when the confirmation could not be opened. */
  problem?: string;
  /** The element (`data-ho`) to focus after the next draw. */
  focus?: string;
  /** Draws the dish page drawn last again. */
  draw?: () => void;
}

let current: { screen: number; dishId: string; session: HandOverSession } | undefined;

/** The session of the dish on the screen shown now; a new one on another screen or dish. */
export const handOverSession = (dishId: string): HandOverSession => {
  const screen = screenShown();
  if (current?.screen === screen && current.dishId === dishId) return current.session;
  const session: HandOverSession = {
    open: false,
    busy: false,
    choice: new Map(),
    handed: new Set(),
    handedAt: new Map(),
    writes: [],
  };
  current = { screen, dishId, session };
  return session;
};

/** Forgets the hand-over (for tests). */
export const resetHandOverSessions = (): void => {
  current = undefined;
};

/**
 * After the box is in the page: focuses the element the session asks for, or the one of the same
 * `data-ho` that had the focus before this draw replaced it (a redraw keeps the focus). A focus
 * that a tap led to shows no ring, as the screen heading's (`focus-quiet`).
 */
export const focusAfterDraw = (box: HTMLElement, session: HandOverSession): void => {
  const active = document.activeElement;
  const was =
    active instanceof HTMLElement
      ? active.closest<HTMLElement>('[data-ho]')?.dataset['ho']
      : undefined;
  const wanted = session.focus ?? was;
  session.focus = undefined;
  if (wanted === undefined) return;
  queueMicrotask(() => {
    if (!box.isConnected) return;
    const target =
      wanted === 'first'
        ? box.querySelector<HTMLElement>('.handover-confirm input, .handover-confirm button')
        : box.querySelector<HTMLElement>(`[data-ho="${CSS.escape(wanted)}"]`);
    if (target === null) return;
    if (target.tabIndex === -1) target.classList.toggle('focus-quiet', pointerLast());
    target.focus();
  });
};
