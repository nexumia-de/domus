// The Components screen: the notebook's components and the shipped ones in one list
// (notebook-list.ts), and the detail of one beside it or as its own screen. A shipped component
// (`#/components/<classic id>.<component id>`) has its own read-only detail (shipped-component.ts).
import { classics } from '../classics/content';
import { currentLang } from '../classics/lang';
import { componentRows } from '../components/list';
import { shippedEntries } from '../components/shipped';
import { getComponent, listComponents, notebook } from '../notebook';
import { strings } from '../strings';
import { notebookExtras } from './notebook-extras';
import { componentDetail } from './component-detail';
import { notebookList, type NotebookListState, type NotebookListText } from './notebook-list';
import { notebookScreen } from './notebook-screen';
import { shippedComponentDetail } from './shipped-component';

/** The search text and the origin choice survive navigation between the list and the details. */
const state: NotebookListState = { query: '' };

const text = (): NotebookListText => ({
  title: strings.screens.components.title,
  searchLabel: strings.notebook.searchLabel,
  listLabel: strings.components.listLabel,
  empty: strings.screens.components.empty,
  emptyNotebook: strings.empty.components,
  guidanceSummary: strings.screens.components.guidanceSummary,
  guidance: strings.screens.components.guidance,
  originAny: strings.components.originAny,
});

export const componentsScreen = (param?: string): HTMLElement =>
  notebookScreen(
    {
      route: 'components',
      pane: (options) =>
        notebookList(
          'components-pane',
          componentRows(listComponents(), shippedEntries(classics(), currentLang())),
          state,
          text(),
          options,
        ),
      detail: (id) => {
        const component = getComponent(id);
        if (component !== undefined) return componentDetail(notebook(component), component);
        return shippedComponentDetail(id);
      },
      unknown: strings.components.unknown,
      chooseOne: strings.components.chooseOne,
      extras: notebookExtras('components'),
    },
    param,
  );
