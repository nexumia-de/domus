// The screen shape of Components and Dishes: the list, and the detail of one entry beside it
// (desktop) or as its own screen (phone). An unknown id shows the list with a quiet note.
import type { Route } from '../router';
import { el } from '../shell/el';
import { entryList, type Entry, type ListState, type ListText } from './entry-list';

export interface NotebookScreen {
  route: Route;
  entries: readonly Entry[];
  state: ListState;
  text: ListText;
  /** The detail of the entry with this id, or undefined when there is none. */
  detail(id: string): HTMLElement | undefined;
  unknown: string;
  chooseOne: string;
}

export const notebookScreen = (config: NotebookScreen, param?: string): HTMLElement => {
  const { route, entries, state, text } = config;
  const screen = el('section', `screen split ${route}-screen`);
  const detail = param === undefined ? undefined : config.detail(param);
  if (detail === undefined || param === undefined) {
    const note = param === undefined ? undefined : config.unknown;
    const list = entryList(
      route,
      entries,
      state,
      text,
      note === undefined ? { asHeading: true } : { asHeading: true, note },
    );
    screen.append(list, el('p', 'pane-empty muted', config.chooseOne));
    return screen;
  }
  screen.classList.add('has-detail');
  screen.append(
    entryList(route, entries, state, text, { asHeading: false, current: param }),
    detail,
  );
  return screen;
};
