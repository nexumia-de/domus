// Units the editors offer: every unit of the schemas, and percent where a base is chosen.
export const AMOUNT_UNITS = [
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'imp-floz',
  'imp-gill',
  'imp-pint',
  'imp-quart',
  'count',
] as const;
export const MASS_ONLY = ['g', 'kg', 'oz', 'lb'] as const;
export type AmountUnit = (typeof AMOUNT_UNITS)[number];
export type MassUnit = (typeof MASS_ONLY)[number];
export type EntryUnit = AmountUnit | 'percent';

/** Roles a component or a dish slot can have (the dish roles; the stored value is the id). */
export const ROLE_IDS = ['main', 'sauce', 'crunch', 'acid', 'garnish', 'starch'] as const;
