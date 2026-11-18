// Strength bands for the drinks filter. They are ranges of the ABV after
// dilution, never names of strength, and they are an assumption: the limits
// lie between the usual ABV ranges of the six root templates
// (docs/balance.md#usual-ranges-per-template: Highball 9.1-12.1, Flip
// 15.4-16.7, Daiquiri 17.6-19.0, Sidecar 23.7-25.6, Martini 25.6-27.8,
// Old-Fashioned 32.1-34.9 %). Change the limits here and in docs/screens-browse.md.

export interface StrengthBand {
  id: string;
  /** Inclusive lower limit in % ABV, absent for the lowest band. */
  from?: number;
  /** Exclusive upper limit in % ABV, absent for the highest band. */
  to?: number;
  label: string;
}

export const STRENGTH_BANDS: readonly StrengthBand[] = [
  { id: 'lt14', to: 14, label: 'Under 14 % ABV' },
  { id: '14-22', from: 14, to: 22, label: '14 to 22 % ABV' },
  { id: '22-30', from: 22, to: 30, label: '22 to 30 % ABV' },
  { id: 'ge30', from: 30, label: '30 % ABV and over' },
];

export function bandOf(id: string): StrengthBand | undefined {
  return STRENGTH_BANDS.find((band) => band.id === id);
}

export function inBand(band: StrengthBand, abv: number): boolean {
  return (band.from === undefined || abv >= band.from) && (band.to === undefined || abv < band.to);
}
