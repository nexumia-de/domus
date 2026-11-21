// The characters of a dish as the screens show them: the name in the content language and, for
// the title of a chip, what the rule rests on. Pure: no DOM.
import { dishCharacters } from '@culina/engine';
import type { CharacterFacts, Lang } from '@culina/engine';
import { CHARACTER_TABLE, characterEntry } from './table';

export interface CharacterChip {
  id: string;
  label: string;
  /** What the rule rests on, in English as the table states it. */
  basis: string;
}

/** The characters the table gives a dish, in the order of the table. */
export const characterIds = (facts: CharacterFacts | undefined): string[] =>
  facts === undefined ? [] : dishCharacters(facts, CHARACTER_TABLE).characters.map((c) => c.id);

/** The name of a character; an id the table does not know is shown as it is. */
export const characterLabel = (id: string, lang: Lang): string =>
  characterEntry(id)?.name[lang] ?? id;

export const characterChips = (ids: readonly string[], lang: Lang): CharacterChip[] =>
  ids.map((id) => ({
    id,
    label: characterLabel(id, lang),
    basis: characterEntry(id)?.basis ?? '',
  }));
