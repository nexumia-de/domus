// "Dishes like this" on a dish page: up to five other dishes, own and shipped, as the lists show
// them, each a link with the characters it shares with this one. Nothing at all when no dish is
// alike enough (`dishesLike` in src/browse/alike.ts holds the measure).
import type { Lang } from '@culina/engine';
import { dishesLike, type LikeEntry } from '../browse/alike';
import type { DishEntry } from '../browse/entry';
import { characterLabel } from '../characters/view';
import { el } from '../shell/el';
import { strings } from '../strings';

/** The section, or `undefined` when nothing is like the dish. */
export const likeSection = (
  dish: LikeEntry,
  entries: readonly DishEntry[],
  lang: Lang,
): HTMLElement | undefined => {
  const alike = dishesLike(dish, entries);
  if (alike.length === 0) return undefined;
  const t = strings.characters;
  const section = el('section', 'like-section');
  const heading = el('h2', undefined, t.likeHeading);
  heading.id = 'like-heading';
  const list = el('ul', 'rows like-list');
  list.setAttribute('aria-labelledby', heading.id);
  for (const { entry, shared } of alike) {
    const item = el('li');
    item.dataset.key = entry.key;
    const a = el('a', 'entry-row row-link like-row');
    a.href = entry.href;
    a.append(
      el('span', 'entry-name', entry.name),
      el(
        'span',
        'entry-meta',
        t.likeShares(shared.map((id) => characterLabel(id, lang)).join(', ')),
      ),
    );
    item.append(a);
    list.append(item);
  }
  section.append(heading, list);
  return section;
};
