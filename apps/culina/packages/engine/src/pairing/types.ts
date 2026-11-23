// Types of the pairing module: the pairing data as the build writes it (tools/flavordb) and what
// a lookup returns. The data says which flavour molecules were found in an ingredient, not how
// much of each; a pairing is therefore a hint computed from shared molecules, never a rule.

/** One ingredient of the pairing data. */
export interface PairingEntity {
  id: number;
  /** The data set's short name, lower case with hyphens. */
  alias: string;
  name: string;
  category: string;
  /** PubChem ids of the flavour molecules found in it, ascending, once each. */
  molecules: readonly number[];
  synonyms?: readonly string[];
}

/** One flavour molecule. */
export interface PairingMolecule {
  name: string;
  /** Words that describe its smell or taste, lower case, sorted. */
  flavours: readonly string[];
}

/** What the lookups read: the entities and, for the words, the molecules by PubChem id. */
export interface PairingData {
  entities: readonly PairingEntity[];
  molecules: Readonly<Record<string, PairingMolecule>>;
}

/** One ingredient that shares molecules with the one asked for. */
export interface Pairing {
  id: number;
  name: string;
  category: string;
  /** How many molecules the two have in common. */
  shared: number;
  /** The weight of the shared molecules over the weight of the molecules of either, 0 to 1. */
  overlap: number;
  /** The flavour words of the shared molecules, those of the rarest molecules first. */
  flavours: string[];
}

/** What is usual for an ingredient: the mean and spread of its overlaps with the others. */
export interface PairingBaseline {
  mean: number;
  spread: number;
}

/** One ingredient that goes with a dish. */
export interface DishPairing {
  id: number;
  name: string;
  category: string;
  /** How far it stands out with the dish, in spreads above what is usual for it; above 0. */
  score: number;
  /** The ids of the dish's ingredients it stands out with, the strongest first. */
  with: number[];
  /** The flavour words of the molecules it shares with them, those of the rarest first. */
  flavours: string[];
}

export interface PairingOptions {
  /** At most this many pairings; 10 when absent. */
  limit?: number;
  /** A pairing needs at least this many shared molecules; `MIN_SHARED` when absent. */
  minShared?: number;
  /** An ingredient with fewer molecules than this is not offered; `MIN_MOLECULES` when absent. */
  minMolecules?: number;
  /** Whether ingredients of the same family (fruit with fruit) are offered too; not when absent. */
  sameFamily?: boolean;
  /** At most this many flavour words per pairing; 5 when absent. */
  flavourLimit?: number;
}
