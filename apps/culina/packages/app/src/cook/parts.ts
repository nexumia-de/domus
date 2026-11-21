// The parts table: which catalogue foods are parts of a whole (data/ingredient-parts.json), for the
// finder's part rule. Every entry is a judgement stated in its `basis`; nothing is derived from a name.
import table from '../../data/ingredient-parts.json';
import type { MakeablePart } from '@culina/engine';

export interface PartEntry extends MakeablePart {
  basis: string;
}

export const PART_TABLE: readonly PartEntry[] = table.entries;

/** The table as the engine reads it. */
export const PARTS: readonly MakeablePart[] = PART_TABLE.map(({ whole, parts }) => ({
  whole,
  parts,
}));
