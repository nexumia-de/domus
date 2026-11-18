// The Components screen: the list, and the detail of one component beside it or as its own screen.
import { componentMeta } from '../components/meta';
import { getComponent, listComponents, notebook } from '../notebook';
import { strings } from '../strings';
import { notebookExtras } from './notebook-extras';
import { componentDetail } from './component-detail';
import type { ListState } from './entry-list';
import { notebookScreen } from './notebook-screen';

/** The search text survives navigation between the list and the details. */
const state: ListState = { query: '' };

export const componentsScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'components',
      entries: listComponents().map((c) => ({ id: c.id, name: c.name, meta: componentMeta(c) })),
      state,
      text: {
        title: strings.screens.components.title,
        searchLabel: strings.notebook.searchLabel,
        listLabel: strings.components.listLabel,
        empty: strings.screens.components.empty,
        emptyNotebook: strings.empty.components,
        guidanceSummary: strings.screens.components.guidanceSummary,
        guidance: strings.screens.components.guidance,
      },
      detail: (id) => {
        const component = getComponent(id);
        return component === undefined ? undefined : componentDetail(notebook(), component);
      },
      unknown: strings.components.unknown,
      chooseOne: strings.components.chooseOne,
      extras: notebookExtras('components'),
    },
    param,
  );
