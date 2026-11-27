// The favourite toggle on the page of a dish, own or shipped (docs/behaviour.md#favourites): a star
// button of 44 px whose name is the same in both states ("Favourite") and whose pressed state says
// which; the tooltip names what a tap does. The status line, which the page puts where it fits,
// says what was done or why not, and the focus stays on the button.
import type { FavouriteOrigin } from '@culina/engine';
import { icon } from '../icons/icons';
import { isFavourite, setFavourite } from '../notebook';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const t = strings.dishes;

export interface FavouriteToggle {
  button: HTMLButtonElement;
  /** A live region: the sentence for the last tap. */
  status: HTMLElement;
}

/**
 * @param origin - `own` for a dish of the notebook, `shipped` for a shipped one.
 * @param id - The id of the dish; for an own dish any of its versions stands for the dish.
 */
export const favouriteToggle = (origin: FavouriteOrigin, id: string): FavouriteToggle => {
  const button = el('button', 'favourite-toggle');
  button.type = 'button';
  button.setAttribute('aria-label', t.favouriteLabel);
  const status = el('p', 'note-quiet favourite-status');
  status.setAttribute('role', 'status');
  let busy = false;

  const draw = (): void => {
    const on = isFavourite(origin, id);
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? t.favouriteRemove : t.favouriteAdd;
    const star = icon('star');
    if (on) star.setAttribute('fill', 'currentColor');
    button.replaceChildren(star);
  };

  button.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    void setFavourite(origin, id, !isFavourite(origin, id)).then((done) => {
      busy = false;
      draw();
      status.textContent = done.ok
        ? done.favourite
          ? t.favouriteAdded
          : t.favouriteRemoved
        : storeText(done.error.code);
    });
  });

  draw();
  return { button, status };
};
