// The shipped classics: the dishes of data/classics/<country>/<id>.json, read-only, never stored.
// Only the tests import this index (it needs the generated file, which pulls every dish into the
// bundle); the app reads the same dishes from dist/classics.json through ./content.
import type { Classic, Country } from '@culina/engine';
import { RAW_CLASSICS, RAW_PACK } from './classics.generated';

/** Every shipped classic in path order (country, then id). The tests check each against its schema. */
export const CLASSICS: readonly Classic[] = RAW_CLASSICS as readonly Classic[];

/** One classic by id, or `undefined`. */
export const classicById = (id: string): Classic | undefined => CLASSICS.find((c) => c.id === id);

/** The classics of one country, in path order. */
export const classicsOf = (country: Country): readonly Classic[] =>
  CLASSICS.filter((c) => c.country === country);

/** Every dish of the import pack (data/pack/<country>/), in path order; never shown until taken. */
export const PACK: readonly Classic[] = RAW_PACK as readonly Classic[];
