// Cook (docs/decisions/cook-screen.md): the one screen for "what do I cook". The one list of every
// dish, own and shipped, under the one filter, with "Only with what I have" and the order "Use up
// first" (../dish-list.ts); the way to the stock; and "Start from one ingredient", which opens
// #/cook/<id>/with (./cook-screen.ts). The old addresses #/start and #/cook/use-up lead here
// (`cookRedirect` in ./redirect.ts, handed to the router in main.ts; #/start is no route and opens
// the default).
import { listIngredients, storeProblem } from '../../notebook';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { notebookSource } from '../../cook/source';
import { dishList } from '../dish-list';
import { storeText } from '../editor/store-text';
import { startSection } from './start';

const t = strings.cook;

export const cookListScreen = (): HTMLElement => {
  const section = el('section', 'screen cook-screen cook-list-screen');
  // The title and the way to the stock on one line, so that the first rows stay on a phone's first
  // screen.
  const stock = el('a', 'btn quiet cook-stock-link', t.tabStock);
  stock.href = hashFor('stock');
  const head = el('div', 'cook-title-row');
  head.append(el('h1', undefined, t.title), stock);
  section.append(head);
  const problem = storeProblem();
  if (problem !== undefined) section.append(el('p', 'note-quiet', storeText(problem)));
  section.append(
    dishList({
      screen: 'cook',
      listLabel: strings.browse.startListLabel,
      empty: [el('p', 'empty', strings.empty.dishes)],
    }),
  );
  if (problem === undefined) {
    const ticked = new Set(
      notebookSource()
        .stock.filter((s) => s.ref.kind === 'ingredient')
        .map((s) => s.ref.id),
    );
    section.append(startSection(listIngredients(), ticked, false));
  }
  return section;
};
