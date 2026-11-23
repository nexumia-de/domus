// What the list panes of the Notebook share (Components: component-list.ts, Dishes: dish-list.ts):
// the options a pane is given, its texts, its head and the collapsible guidance.
import { el } from '../shell/el';

/** What a list pane is given by the screen around it (notebook-screen.ts). */
export interface PaneOptions {
  /** With it the pane carries the screen's h1; beside a detail it is a labelled region. */
  asHeading: boolean;
  current?: string;
  note?: string;
  /** The parts of the Notebook, right under the title. */
  tabs?: Node;
  /** Shown under the title: the way to add one. */
  actions?: Node[];
  /** Shown with the empty state: example data. */
  emptyActions?: Node[];
}

export interface ListText {
  title: string;
  searchLabel: string;
  listLabel: string;
  /** No entry matches the search. */
  empty: string;
  /** The notebook has none of these yet. */
  emptyNotebook: string;
  guidanceSummary: string;
  guidance: string;
}

/** The head of a list pane: the h1 or the region's label, the parts, a note and the actions. */
export const paneHead = (pane: HTMLElement, text: ListText, options: PaneOptions): void => {
  if (options.asHeading) pane.append(el('h1', undefined, text.title));
  else pane.setAttribute('aria-label', text.listLabel);
  if (options.tabs !== undefined) pane.append(options.tabs);
  if (options.note !== undefined) pane.append(el('p', 'note-quiet', options.note));
  if (options.actions !== undefined) pane.append(...options.actions);
};

/** The collapsible guidance at the foot of a list pane. */
export const paneGuidance = (text: ListText): HTMLElement => {
  const guidance = el('details', 'guidance');
  guidance.append(
    el('summary', undefined, text.guidanceSummary),
    el('p', undefined, text.guidance),
  );
  return guidance;
};
