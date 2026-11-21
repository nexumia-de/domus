// The character table (data/dish-characters.json): the rules the engine judges a dish by, with
// the name of each character and what the rule rests on. Every row is a judgement of the project.
import type { CharacterRule } from '@culina/engine';
import table from '../../data/dish-characters.json';

export interface CharacterEntry extends CharacterRule {
  name: { en: string; de: string };
  basis: string;
}

export const CHARACTER_TABLE: readonly CharacterEntry[] = table.characters;

/** The classes that make a dish not "without meat and fish" (`./meat-free.ts`), and why. */
export const MEAT_AND_FISH: { readonly classes: readonly string[]; readonly basis: string } =
  table.meatAndFish;

const byId = new Map(CHARACTER_TABLE.map((e) => [e.id, e]));

export const characterEntry = (id: string): CharacterEntry | undefined => byId.get(id);
