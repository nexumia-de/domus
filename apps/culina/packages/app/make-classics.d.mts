/** The content of dist/classics.json: the lists of every shipped dish, technique, handling rule and substitute. */
export function shippedContent(): {
  format: string;
  formatVersion: number;
  classics: unknown[];
  techniques: unknown[];
  handling: unknown[];
  substitutes: unknown[];
};
/** Writes the generated index of the dishes the tests read; returns how many dishes it lists. */
export function makeClassics(): number;
