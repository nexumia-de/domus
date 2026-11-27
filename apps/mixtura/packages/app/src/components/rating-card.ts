// "Your rating" on the spec screen: a heart, thumbs up or thumbs down (Favourite, Good, Not for me), for the drink as a whole, for
// the person this device is (docs/ratings.md). Pressing the chosen one again clears it.
import * as glyph from './glyphs';
import { h } from '../dom';
import { householdHref } from '../household';
import { RATINGS, type Rating } from '../ratings/source';
import { strings } from '../strings';

const ICONS = { favourite: glyph.heart, good: glyph.thumbUp, 'not-for-me': glyph.thumbDown };

export interface RatingCardVM {
  current: Rating | undefined;
  /** False in a shared space whose person this device has not chosen yet. */
  canRate: boolean;
  spaceId: string;
}

export function ratingCard(
  vm: RatingCardVM | undefined,
  onRate: (rating: Rating | undefined) => void,
): HTMLElement | null {
  if (!vm) return null;
  const t = strings.ratings;
  return h(
    'section',
    { class: 'card rating-card', 'aria-labelledby': 'rating-title', 'data-rating': '' },
    h('h2', { id: 'rating-title' }, t.title),
    vm.canRate
      ? h(
          'div',
          { class: 'chips', role: 'group', 'aria-labelledby': 'rating-title' },
          ...RATINGS.map((rating) =>
            h(
              'button',
              {
                type: 'button',
                class: 'chip rating-chip',
                'aria-pressed': String(vm.current === rating),
                'aria-label': t.words[rating],
                title: t.words[rating],
                'data-rate': rating,
                onclick: () => onRate(vm.current === rating ? undefined : rating),
              },
              ICONS[rating](),
            ),
          ),
          h(
            'span',
            { class: 'note', 'aria-hidden': 'true' },
            vm.current ? t.words[vm.current] : '',
          ),
        )
      : h(
          'p',
          { class: 'note' },
          t.choosePerson,
          ' ',
          h('a', { class: 'line-link', href: householdHref(vm.spaceId) }, t.openHousehold),
        ),
  );
}
