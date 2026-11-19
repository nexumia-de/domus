// The start screen: it asks what to cook. The first choice is the classics by country; behind it the
// tools that were there before (ratios, components, dishes, what can I cook, stock) stay reachable.
import { classics } from '../../classics/content';
import { countryChoices } from '../../classics/list-view';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { countryLinks } from './country-links';

const t = strings.classics;

const TOOLS = [
  ['ratios', t.tools.ratios],
  ['components', t.tools.components],
  ['dishes', t.tools.dishes],
  ['cook', t.tools.cook],
  ['stock', t.tools.stock],
] as const;

export const startScreen = (): HTMLElement => {
  const section = el('section', 'screen start-screen');
  const classicsBlock = el('section', 'start-block');
  classicsBlock.append(
    el('h2', undefined, t.classicsHeading),
    countryLinks(countryChoices(classics())),
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
  section.append(el('h1', undefined, t.startTitle), el('p', 'muted', t.startIntro));
  section.append(classicsBlock, tools);
  return section;
};
