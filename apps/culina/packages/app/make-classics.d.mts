/** The content of dist/classics.json: the lists of every shipped dish, technique, handling rule and substitute. */
export function shippedContent(): {
  format: string;
  formatVersion: number;
  classics: unknown[];
  techniques: unknown[];
  handling: unknown[];
  substitutes: unknown[];
};
/** Every frame of data/frames/, composed into a base (a dish file with `frame: true`). */
export function frameContent(classics?: unknown[]): unknown[];
/** The content of dist/classics-pack.json: the dishes of the import pack. */
export function packContent(): { format: string; formatVersion: number; classics: unknown[] };
/** Writes the generated index of the dishes and the pack the tests read; returns how many dishes it lists. */
export function makeClassics(): number;
