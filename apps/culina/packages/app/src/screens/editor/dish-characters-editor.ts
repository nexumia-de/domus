// The cook's correction of a dish's characters in the dish editor: one tick box per character of
// the table. A box is ticked where the dish shows the character; where that differs from what the
// rules work out, the row says so, and "As worked out" drops every correction.
import { characterLookup } from '../../characters/lookup';
import { characterEntry } from '../../characters/table';
import { characterLabel } from '../../characters/view';
import { characterTicks, computedOfDraft, setCharacter } from '../../editor/dish-characters';
import type { DishForm } from '../../editor/dish-form';
import { notebook } from '../../notebook';
import { currentLang } from '../../classics/lang';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { button } from './form-bits';

export interface CharactersEditor {
  element: HTMLElement;
  /** Draws the ticks again: the slots, the amounts or the catalogue changed. */
  refresh(): void;
}

export const charactersEditor = (form: DishForm, changed: () => void): CharactersEditor => {
  const t = strings.characters;
  const element = el('fieldset', 'dish-characters-edit');
  const list = el('ul', 'character-ticks tick-choices');
  const reset = button(t.reset, 'quiet', () => {
    delete form.characters;
    changed();
    refresh();
    reset.blur();
  });
  reset.classList.add('character-reset');
  element.append(
    el('legend', undefined, t.editHeading),
    el('p', 'note-quiet', t.editHint),
    list,
    reset,
  );

  const refresh = (): void => {
    const lang = currentLang();
    const computed = computedOfDraft(notebook(), form, characterLookup);
    // The box that had the focus keeps it: a tick draws the list again.
    const active = document.activeElement;
    const focused = active instanceof HTMLInputElement ? active.dataset.character : undefined;
    list.replaceChildren(
      ...characterTicks(computed, form.characters).map((tick) => {
        const item = el('li', 'character-tick');
        const label = el('label', 'choice');
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = tick.shown;
        box.dataset.character = tick.id;
        box.addEventListener('change', () => {
          const next = setCharacter(form.characters, computed, tick.id, box.checked);
          if (next === undefined) delete form.characters;
          else form.characters = next;
          changed();
          refresh();
        });
        const basis = characterEntry(tick.id)?.basis ?? '';
        if (basis !== '') label.title = basis;
        label.append(box, el('span', undefined, characterLabel(tick.id, lang)));
        if (tick.shown !== tick.computed) {
          item.dataset.corrected = tick.shown ? 'added' : 'removed';
          label.append(el('span', 'character-corrected', tick.shown ? t.added : t.removed));
        }
        item.append(label);
        return item;
      }),
    );
    reset.hidden = form.characters === undefined;
    if (focused !== undefined) {
      list.querySelector<HTMLInputElement>(`input[data-character="${focused}"]`)?.focus();
    }
  };
  refresh();
  return { element, refresh };
};
