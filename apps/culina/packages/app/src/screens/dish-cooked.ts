// The date a dish was cooked, on the page of an own dish (docs/behaviour.md#the-date-a-dish-was-cooked):
// "Last cooked: 18 Nov 2026" or that none is kept, "Cooked today" and, while a day is kept, "Clear
// the date". The day is the dish's (its family's), whichever version is on screen. After either
// action the box is drawn again and the status line, which says what was done, takes the focus.
import { clearCooked, cookedOn, markCooked } from '../notebook';
import { formatDate } from '../shared/locale';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const t = strings.dishes;

export const cookedSection = (dishId: string): HTMLElement => {
  const box = el('section', 'dish-cooked');
  let message: string | undefined;
  let busy = false;

  const act = (work: () => Promise<{ ok: boolean; text: string }>): void => {
    if (busy) return;
    busy = true;
    void work().then((done) => {
      busy = false;
      message = done.text;
      draw(true);
    });
  };

  function draw(moveFocus: boolean): void {
    const date = cookedOn(dishId);
    const line = el(
      'p',
      'muted dish-cooked-line',
      date === undefined ? t.cookedNone : t.cookedLine(formatDate(date)),
    );
    const actions = el('div', 'actions dish-cooked-actions');
    const today = el('button', 'btn quiet dish-cooked-today', t.cookedToday);
    today.type = 'button';
    today.addEventListener('click', () =>
      act(async () => {
        const done = await markCooked(dishId);
        return done.ok
          ? { ok: true, text: t.cookedKept(formatDate(done.date)) }
          : { ok: false, text: storeText(done.error.code) };
      }),
    );
    actions.append(today);
    if (date !== undefined) {
      const clear = el('button', 'btn quiet dish-cooked-clear', t.cookedClear);
      clear.type = 'button';
      clear.addEventListener('click', () =>
        act(async () => {
          const done = await clearCooked(dishId);
          return done.ok
            ? { ok: true, text: t.cookedCleared }
            : { ok: false, text: storeText(done.error.code) };
        }),
      );
      actions.append(clear);
    }
    const status = el('p', 'note-quiet dish-cooked-status');
    status.setAttribute('role', 'status');
    status.tabIndex = -1;
    status.textContent = message ?? '';
    message = undefined;
    box.replaceChildren(line, actions, status);
    if (moveFocus) status.focus();
  }

  draw(false);
  return box;
};
