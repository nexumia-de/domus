// One row of the drinks list: name, template and ABV after dilution on the
// second line. The ABV is computed when the row is made, not before.

import { h } from '../../dom';
import { strings } from '../../strings';
import type { BrowseModel, Drink } from '../browse/model';

export function drinkRow(
  model: BrowseModel,
  drink: Drink,
  href: string,
  selected: boolean,
): HTMLElement {
  const { spec } = drink;
  const template = spec.templateId ? model.templateById.get(spec.templateId) : undefined;
  const abv = model.abvOf(spec);
  const second = [
    template?.name ?? strings.browse.noTemplate,
    abv === undefined ? strings.browse.abvNone : strings.browse.abvRow(abv),
  ].join(' · ');
  return h(
    'li',
    {},
    h(
      'a',
      { class: 'row', href, 'aria-current': selected ? 'true' : undefined },
      h(
        'span',
        { class: 'row-main' },
        h('span', { class: 'row-title' }, spec.name),
        h('span', { class: 'row-sub' }, second),
      ),
    ),
  );
}
