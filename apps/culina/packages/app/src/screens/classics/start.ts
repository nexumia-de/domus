// The start screen: "What do you feel like?" The one filter and the list of every dish under it
// (the same list as Dishes, ../dish-list.ts, with the same stored choice), then the ways into the
// tools (ratios, components, dishes, what can I cook, stock), as before.
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { dishList } from '../dish-list';

const t = strings.classics;

// In the order of the navigation: Cook (with the stock it works from), the Notebook, the ratios.
const TOOLS = [
  ['cook', t.tools.cook],
  ['stock', t.tools.stock],
  ['components', t.tools.components],
  ['dishes', t.tools.dishes],
  ['ratios', t.tools.ratios],
] as const;

export const startScreen = (): HTMLElement => {
  const section = el('section', 'screen start-screen');
  const dishes = el('section', 'start-block start-dishes');
  dishes.append(
    dishList({
      screen: 'start',
      listLabel: strings.browse.startListLabel,
      empty: [el('p', 'empty', strings.empty.dishes)],
    }),
  );
  const tools = el('section', 'start-block');
  const list = el('ul', 'rows start-tools');
  for (const [route, label] of TOOLS) {
    const item = el('li');
    const link = el('a', 'row-link', label);
    link.href = hashFor(route);
    item.append(link);
    list.append(item);
  }
  tools.append(el('h2', undefined, t.toolsHeading), el('p', 'muted', t.toolsHint), list);
  section.append(el('h1', undefined, strings.browse.startTitle), dishes, tools);
  return section;
};
