// The ratio list: search by name, families with a heading each, one link per ratio.
import { resolveTemplate } from '@culina/engine';
import type { RatioTemplate } from '@culina/engine';
import { groupFamilies } from '../ratios/families';
import { shortRatio } from '../ratios/format';
import { filterTemplates } from '../ratios/search';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { nextId } from './fields';

export interface ListState {
  query: string;
}

const row = (templates: readonly RatioTemplate[], template: RatioTemplate, current?: string) => {
  const item = el('li');
  const a = el('a', 'ratio-row');
  a.href = hashFor('ratios', template.id);
  if (template.id === current) a.setAttribute('aria-current', 'page');
  a.append(el('span', 'ratio-name', template.name));
  const resolved = resolveTemplate(templates, template.id);
  if (resolved.ok) {
    const short = shortRatio(resolved.template.parts);
    a.append(el('span', 'ratio-short', short.numbers), el('span', 'ratio-roles', short.roles));
  }
  item.append(a);
  return item;
};

/**
 * The list pane. With `asHeading` it carries the screen's h1 (list screen);
 * beside a card it is a labelled region instead.
 */
export const ratioList = (
  templates: readonly RatioTemplate[],
  state: ListState,
  options: { asHeading: boolean; current?: string; note?: string },
): HTMLElement => {
  const pane = el('section', 'ratio-list');
  if (options.asHeading) pane.append(el('h1', undefined, strings.screens.ratios.title));
  else pane.setAttribute('aria-label', strings.ratios.listLabel);
  if (options.note !== undefined) pane.append(el('p', 'note-quiet', options.note));

  const search = el('input', 'field');
  search.type = 'search';
  search.autocomplete = 'off';
  search.spellcheck = false;
  search.id = nextId('search');
  search.value = state.query;
  const label = el('label', 'field-label', strings.ratios.searchLabel);
  label.htmlFor = search.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(label, search);

  const groups = el('div', 'groups');
  const draw = (): void => {
    groups.replaceChildren();
    const shown = new Set(filterTemplates(templates, state.query).map((t) => t.id));
    for (const family of groupFamilies(templates)) {
      const members = family.members.filter((m) => shown.has(m.id));
      if (members.length === 0) continue;
      const section = el('section', 'family-group');
      const list = el('ul', 'rows');
      list.append(...members.map((m) => row(templates, m, options.current)));
      // A family of one is just its row: a heading would repeat the name.
      if (family.members.length > 1) section.append(el('h2', undefined, family.name));
      section.append(list);
      groups.append(section);
    }
    if (shown.size === 0) groups.append(el('p', 'empty', strings.screens.ratios.empty));
  };
  search.addEventListener('input', () => {
    state.query = search.value;
    draw();
  });
  draw();

  const guidance = el('details', 'guidance');
  guidance.append(
    el('summary', undefined, strings.screens.ratios.guidanceSummary),
    el('p', undefined, strings.screens.ratios.guidance),
  );
  pane.append(wrap, groups, guidance);
  return pane;
};
