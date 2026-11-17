// ABV and sugar of an ingredient from the source (docs/seed-data.md,
// Mapping). Acid is never derived: the source has one unit-less value and
// the curated file has none that was read from a source.
export interface Props {
  abv?: number;
  sugar?: number;
}

/** A 0 here means "not filled in", not "no alcohol". */
export const ABV_ZERO_UNKNOWN = [
  'spirits',
  'liqueurs',
  'aperitif',
  'fortified-wine',
  'bitters',
  'wines',
  'creme-de',
];
/** A 0 here means "not filled in", not "no sugar". */
export const SUGAR_ZERO_UNKNOWN = [
  'sweeteners',
  'liqueurs',
  'creme-de',
  'aperitif',
  'fortified-wine',
  'infusions',
];

export interface PropertyInput {
  strength: number;
  /** Grams per litre, although the source field is named per ml. */
  sugar_g_per_ml: number;
}

export interface PropertyResult {
  props: Props;
  abvOmitted: boolean;
  sugarOmitted: boolean;
}

/** `ancestors` are the ids of the node and its ancestors in the output tree. */
export function deriveProperties(
  item: PropertyInput,
  ancestors: readonly string[],
): PropertyResult {
  const inFamily = (family: readonly string[]) => ancestors.some((a) => family.includes(a));
  const props: Props = {};
  const abvOmitted = item.strength === 0 && inFamily(ABV_ZERO_UNKNOWN);
  if (!abvOmitted) props.abv = item.strength;
  const sugarOmitted = item.sugar_g_per_ml === 0 && inFamily(SUGAR_ZERO_UNKNOWN);
  if (!sugarOmitted) props.sugar = Number((item.sugar_g_per_ml / 10).toFixed(4));
  return { props, abvOmitted, sugarOmitted };
}
