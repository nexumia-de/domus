// The characters of a dish as a row of quiet chips; a chip's title says what its rule rests on.
import type { CharacterChip } from '../characters/view';
import { el } from '../shell/el';
import { strings } from '../strings';

/** The row, or `undefined` when the dish has no character. */
export const characterRow = (chips: readonly CharacterChip[]): HTMLElement | undefined => {
  if (chips.length === 0) return undefined;
  const list = el('ul', 'character-chips');
  list.setAttribute('aria-label', strings.characters.label);
  for (const chip of chips) {
    const item = el('li', 'character-chip', chip.label);
    item.dataset.character = chip.id;
    if (chip.basis !== '') item.title = chip.basis;
    list.append(item);
  }
  return list;
};
