// A ratio card: parts (and percent of the anchor), range, source, family, calculator and comparison.
import { templatePercent } from '@culina/engine';
import type { EffectiveTemplate, RatioTemplate } from '@culina/engine';
import { relatives } from '../ratios/families';
import { formatNumber } from '../ratios/format';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import { calculatorSection } from './ratio-calculator';
import { compareSection } from './ratio-compare';

const link = (template: RatioTemplate): HTMLLIElement => {
  const item = el('li');
  const a = el('a', 'family-link', template.name);
  a.href = hashFor('ratios', template.id);
  item.append(a);
  return item;
};

const partsTable = (resolved: EffectiveTemplate): HTMLTableElement => {
  const percent = templatePercent(resolved);
  const table = el('table', 'parts');
  const head = el('tr');
  const columns: [string, string | undefined][] = [
    [strings.ratios.colRole, undefined],
    [strings.ratios.colParts, 'num'],
  ];
  if (percent.ok) columns.push([strings.ratios.colPercent(resolved.anchor ?? ''), 'num']);
  for (const [text, cls] of columns) {
    const th = el('th', cls, text);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const body = el('tbody');
  for (const part of resolved.parts) {
    const tr = el('tr');
    const name = el('th', undefined, part.role);
    name.scope = 'row';
    const parts = el('td', 'num', formatNumber(part.parts));
    if (part.range !== undefined) {
      parts.append(
        el(
          'span',
          'range',
          strings.ratios.usualRange(formatNumber(part.range.min), formatNumber(part.range.max)),
        ),
      );
    }
    tr.append(name, parts);
    if (percent.ok) tr.append(el('td', 'num', formatNumber(percent.pct[part.role] ?? 0)));
    body.append(tr);
  }
  table.append(body);
  return table;
};

const familySection = (
  templates: readonly RatioTemplate[],
  id: string,
): HTMLElement | undefined => {
  const { parent, children } = relatives(templates, id);
  if (parent === undefined && children.length === 0) return undefined;
  const section = el('section', 'family');
  section.append(el('h2', undefined, strings.ratios.familyHeading));
  if (parent !== undefined) {
    const list = el('ul', 'links');
    list.append(link(parent));
    section.append(el('h3', undefined, strings.ratios.parentLabel), list);
  }
  if (children.length > 0) {
    const list = el('ul', 'links');
    list.append(...children.map(link));
    section.append(el('h3', undefined, strings.ratios.variationsLabel), list);
  }
  return section;
};

/** The card of one template; `resolved` is its effective form. */
export const ratioCard = (
  templates: readonly RatioTemplate[],
  template: RatioTemplate,
  resolved: EffectiveTemplate,
): HTMLElement => {
  const card = el('article', 'card');
  const back = el('a', 'back-link', strings.ratios.back);
  back.href = hashFor('ratios');
  card.append(back, el('h1', undefined, template.name), partsTable(resolved));
  if (template.note !== undefined) card.append(el('p', 'muted', template.note));
  card.append(el('p', 'source muted', `${strings.ratios.sourceLabel}: ${template.source}`));
  const family = familySection(templates, template.id);
  if (family) card.append(family);
  card.append(calculatorSection(resolved), compareSection(resolved));
  return card;
};
