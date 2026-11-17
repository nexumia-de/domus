// The drinks whose alcohol class cannot be calculated, under the count line
// while an alcohol filter is on: how many, and on a tap why, grouped by
// reason with the drinks as links (docs/screens-browse.md#alcohol-filters).

import { h } from '../../dom';
import { strings } from '../../strings';
import type { UnknownGroup } from '../browse/alcohol';
import type { Filters } from '../browse/filters';
import type { SortId } from '../browse/sort';
import { specHash } from './url';

export function unknownDetails(
  groups: readonly UnknownGroup[],
  total: number,
  filters: Filters,
  sort?: SortId,
): HTMLElement {
  const words = strings.browse.alcohol;
  return h(
    'details',
    { class: 'unknown-details', 'data-unknown-alcohol': '' },
    h('summary', { class: 'btn btn--tonal' }, words.unknownCount(total)),
    h('p', { class: 'note' }, words.unknownIntro),
    ...groups.map((group) =>
      h(
        'section',
        { class: 'unknown-group' },
        h(
          'h3',
          {},
          `${words.reasons[String(group.reason)] ?? String(group.reason)} (${group.drinks.length})`,
        ),
        h(
          'ul',
          { class: 'unknown-list' },
          ...group.drinks.map(({ drink, ingredients }) =>
            h(
              'li',
              {},
              h(
                'a',
                { href: specHash(drink.spec.lineageId, filters, sort) },
                words.unknownDrink(drink.spec.name, ingredients),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
