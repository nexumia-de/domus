// "Staples" on the Stock screen: while salt or pepper has no stock item, one button ticks the ones
// not yet there as always there (the catalogue entry is copied into the notebook first, as the
// picker does). Nothing is assumed silently: until the tap they are not there. Undo unticks them.
import type { ComponentRef } from '@culina/engine';
import { adoptEntry } from '../../catalogue/adopt';
import { loadCatalogue } from '../../catalogue/load';
import { listStock, tick, untick } from '../../notebook';
import { appLang } from '../../shared/locale';
import { displayName } from '../../shared/names';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { missingStaples } from '../../stock/staples';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';

const t = strings.stock;

/** The section, or undefined when every staple is ticked. Names appear once the catalogue is read. */
export const staplesSection = (): HTMLElement | undefined => {
  const missing = missingStaples(listStock());
  if (missing.length === 0) return undefined;
  const section = el('section', 'stock-staples');
  section.setAttribute('aria-labelledby', 'stock-staples-heading');
  const heading = el('h2', undefined, t.staplesHeading);
  heading.id = 'stock-staples-heading';
  const hint = el('p', 'note-quiet', '');
  const button = el('button', 'btn stock-staples-tick', t.staplesTick);
  button.type = 'button';
  button.disabled = true;
  section.append(heading, hint, button);

  void loadCatalogue().then((loaded) => {
    const byId = new Map((loaded ?? []).map((e) => [e.id, e]));
    const entries = missing.flatMap((s) => {
      const entry = byId.get(s.id);
      return entry === undefined ? [] : [entry];
    });
    if (entries.length === 0) return void section.remove();
    const names = entries.map((e) => displayName(e, appLang)).join(', ');
    hint.textContent = t.staplesHint(names);
    button.disabled = false;
    button.addEventListener('click', () => {
      button.disabled = true;
      void (async () => {
        const done: ComponentRef[] = [];
        for (const entry of entries) {
          const adopted = await adoptEntry(entry, byId);
          const ticked = adopted.ok ? await tick(adopted.ref, true) : adopted;
          if (!ticked.ok) {
            button.disabled = false;
            return showToast(storeText(ticked.error.code));
          }
          done.push({ kind: 'ingredient', id: entry.id });
        }
        showToast(t.staplesTicked(names), {
          label: t.undo,
          run: () => void Promise.all(done.map((ref) => untick(ref))),
        });
      })();
    });
  });
  return section;
};
