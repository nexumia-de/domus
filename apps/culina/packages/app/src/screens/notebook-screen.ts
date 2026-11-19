// The screen shape of Components and Dishes: the list, and the detail of one entry beside it
// (desktop) or as its own screen (phone). An unknown id shows the list with a quiet note.
import { hashFor, type Route } from '../router';
import { strings } from '../strings';
import { el } from '../shell/el';
import { sectionTabs } from './section-tabs';
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
  /** The action to add an entry and the example-data action of an empty notebook. */
  extras: { actions: Node[]; emptyActions: Node[]; note?: string };
}

export const notebookScreen = (config: NotebookScreen, param?: string): HTMLElement => {
  const { route, entries, state, text } = config;
  const tabs = sectionTabs(strings.notebook.sectionsLabel, [
    {
      label: strings.screens.components.title,
      hash: hashFor('components'),
      current: route === 'components',
    },
    { label: strings.screens.dishes.title, hash: hashFor('dishes'), current: route === 'dishes' },
  ]);
  const screen = el('section', `screen split ${route}-screen`);
  const detail = param === undefined ? undefined : config.detail(param);
  if (detail === undefined || param === undefined) {
    const note = param === undefined ? config.extras.note : config.unknown;
    const list = entryList(route, entries, state, text, {
      asHeading: true,
      tabs,
      actions: config.extras.actions,
      emptyActions: config.extras.emptyActions,
      ...(note === undefined ? {} : { note }),
    });
    screen.append(list, el('p', 'pane-empty muted', config.chooseOne));
    return screen;
  }
  screen.classList.add('has-detail');
  screen.append(
    entryList(route, entries, state, text, {
      asHeading: false,
      tabs,
      current: param,
      actions: config.extras.actions,
      emptyActions: config.extras.emptyActions,
    }),
    detail,
  );
  return screen;
};
