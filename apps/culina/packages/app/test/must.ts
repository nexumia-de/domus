/** Narrows a value that a test knows is there; throws with `what` when it is not. */
export const must = <T>(value: T | null | undefined, what = 'value'): T => {
  if (value === null || value === undefined) throw new Error(`missing: ${what}`);
  return value;
};
