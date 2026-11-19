// The parts of a destination, as a row of equal links at the top of its screens: the two parts of
// Cook (with what I have, classics) and of the Notebook (components, dishes). One group, not a
// landmark: the page keeps its one navigation. The current part is marked with aria-current, bold
// text and a bar, not by colour alone.
import { el } from '../shell/el';

export interface SectionTab {
  label: string;
  hash: string;
  current: boolean;
}

export const sectionTabs = (label: string, tabs: readonly SectionTab[]): HTMLElement => {
  const group = el('div', 'section-tabs');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  const list = el('ul', 'section-tab-list');
  for (const tab of tabs) {
    const link = el('a', 'section-tab', tab.label);
    link.href = tab.hash;
    if (tab.current) link.setAttribute('aria-current', 'page');
    const item = el('li');
    item.append(link);
    list.append(item);
  }
  group.append(list);
  return group;
};
