// The screen shape of Components and Dishes: the list, and the detail of one entry beside it
// (desktop) or as its own screen (phone). An unknown id shows the list with a quiet note.
import { hashFor, type Route } from '../router';
import { strings } from '../strings';
import { el } from '../shell/el';
import { sectionTabs } from './section-tabs';
import type { PaneOptions } from './entry-list';

interface Shape {
  route: Route;
  /** The detail of the entry with this id, or undefined when there is none. */
  detail(id: string): HTMLElement | undefined;
  unknown: string;
  chooseOne: string;
  /** The action to add an entry and the example-data action of an empty notebook. */
  extras: { actions: Node[]; emptyActions: Node[]; note?: string };
}

/** Each part draws its own list pane (component-list.ts, dishes.ts). */
export type NotebookScreen = Shape & { pane(options: PaneOptions): HTMLElement };

export const notebookScreen = (config: NotebookScreen, param?: string): HTMLElement => {
  const { route } = config;
  const pane = (options: PaneOptions): HTMLElement => config.pane(options);
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
    screen.append(
      pane({
        asHeading: true,
        tabs,
        actions: config.extras.actions,
        emptyActions: config.extras.emptyActions,
        ...(note === undefined ? {} : { note }),
      }),
      el('p', 'pane-empty muted', config.chooseOne),
    );
    return screen;
  }
  screen.classList.add('has-detail');
  screen.append(
    pane({
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
