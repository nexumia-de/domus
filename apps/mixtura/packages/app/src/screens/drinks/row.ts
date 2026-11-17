// One row of the drinks list: name, template and ABV after dilution on the
// second line. The ABV is computed when the row is made, not before.

import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import type { Availability } from '../../stock/derived';
import { strings } from '../../strings';
import type { BrowseModel, Drink } from '../browse/model';

export function drinkRow(
  model: BrowseModel,
  drink: Drink,
  href: string,
  selected: boolean,
  availability?: Availability,
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
      availability && availabilityTag(model, availability),
    ),
  );
}

/** Words and a shape, never colour alone: a check, a swap or a dash. */
function availabilityTag(model: BrowseModel, a: Availability): HTMLElement {
  const words = strings.browse.availability;
  if (a.kind === 'makeable') {
    return h('span', { class: 'tag tag--strong tag--row' }, glyph.check(), words.tagMakeable);
  }
  if (a.kind === 'substitute') {
    return h('span', { class: 'tag tag--row' }, glyph.swap(), words.tagSubstitute);
  }
  return h(
    'span',
    { class: 'tag tag--row' },
    glyph.none(),
    words.tagMissing(model.ingredientName(a.missing) ?? a.missing),
  );
}
