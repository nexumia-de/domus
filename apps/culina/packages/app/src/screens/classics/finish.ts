// The end of cooking: offer to keep the dish in the notebook as version 1 with its origin. Where the
// engine refuses (a line still has a wanted ingredient) a short neutral explanation takes its place.
import { pickText, wantedLines } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import { keepClassic } from '../../classics/keep';
import { hashFor } from '../../router';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';

const t = strings.classics;

let keeping = false;

/**
 * "Keep in my notebook": copies the classic into the notebook (`keepClassic`) and opens the new
 * dish. `scope` is the selector of the box that holds the button and its live status line, which
 * a redraw may have replaced. Used at the end of cooking and on the dish screen.
 */
export const keepButton = (
  classic: Classic,
  portions: () => number,
  lang: Lang,
  scope: string,
  className: string,
): HTMLButtonElement => {
  const say = (text: string): void => {
    const live = document.querySelector(`${scope} [role="status"]`);
    if (live !== null) live.textContent = text;
  };
  const keep = el('button', `btn ${className} keep-button`, t.keepButton);
  keep.type = 'button';
  keep.addEventListener('click', () => {
    if (keeping) return;
    keeping = true;
    keep.disabled = true;
    say(t.keepWorking);
    void keepClassic(classic, portions(), lang)
      .then((done) => {
        if (done.ok) {
          window.location.hash = hashFor('dishes', done.dishId);
          return;
        }
        if (done.reason === 'wanted') say(t.keepCannot(done.names.join(', ')));
        else if (done.reason === 'store' && !done.result.ok) say(storeText(done.result.error.code));
        else say(t.keepProblem);
      })
      .finally(() => {
        keeping = false;
        const live = document.querySelector<HTMLButtonElement>(`${scope} .keep-button`);
        if (live !== null) live.disabled = false;
      });
  });
  return keep;
};

export const finishPanel = (classic: Classic, portions: number, lang: Lang): HTMLElement => {
  const panel = el('div', 'classic-finish');
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  panel.append(el('h2', undefined, t.doneHeading), el('p', undefined, t.doneText));
  const wanted = wantedLines(classic);
  if (wanted.length > 0) {
    const names = [...new Set(wanted.map((w) => pickText(w.wanted, lang)))].join(', ');
    panel.append(el('p', 'note-quiet keep-cannot', t.keepCannot(names)), status);
    return panel;
  }
  const keep = keepButton(classic, () => portions, lang, '.classic-finish', 'primary');
  panel.append(keep, el('p', 'muted', t.keepNote), status);
  return panel;
};
