// The character table (data/dish-characters.json): the rules the engine judges a dish by, with
// the name of each character and what the rule rests on. Every row is a judgement of the project.
import type { CharacterRule } from '@culina/engine';
import table from '../../data/dish-characters.json';

export interface CharacterEntry extends CharacterRule {
  name: { en: string; de: string };
  basis: string;
}

export const CHARACTER_TABLE: readonly CharacterEntry[] = table.characters;

const byId = new Map(CHARACTER_TABLE.map((e) => [e.id, e]));

export const characterEntry = (id: string): CharacterEntry | undefined => byId.get(id);
