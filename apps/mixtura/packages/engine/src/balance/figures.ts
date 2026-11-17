// The figures of docs/balance.md: ABV, sugar, acid, volume, sugar-to-acid
// ratio and units of alcohol, before and after dilution.
import { mix, type MixPart } from '../ingredients/mixture';
import type { UnknownIds } from './lines';
import { figureOf, totals, volumeOf } from './sums';
import type { AfterFigures, BalanceFigures, BeforeFigures, DilutionUsed, Figure } from './types';

/** Millilitres of ethanol in one UK unit. */
const ML_ETHANOL_PER_UK_UNIT = 10;

function times(f: Figure, factor: number): Figure {
  return f.known ? { known: true, value: f.value * factor } : f;
}

function ratio(sugarG: Figure, acidG: Figure): Figure<number | null> {
  if (!sugarG.known) return sugarG;
  if (!acidG.known) return acidG;
  return { known: true, value: acidG.value === 0 ? null : sugarG.value / acidG.value };
}

export function figures(
  parts: readonly MixPart[],
  unknown: UnknownIds,
  dilution?: DilutionUsed,
): Pick<BalanceFigures, 'before' | 'after' | 'sugarAcidRatio' | 'ukUnits'> {
  const t = totals(parts, unknown);
  const m0 = mix(parts, 0);
  const before: BeforeFigures = {
    volumeMl: t.volumeMl,
    ethanolMl: t.ethanolMl,
    abvPct: figureOf(m0.abv, unknown.abv),
    sugarG: t.sugarG,
    sugarPer100Ml: figureOf(m0.sugar, unknown.sugar),
    acidG: t.acidG,
    acidPct: figureOf(m0.acid, unknown.acid),
  };
  let after: AfterFigures | undefined;
  if (dilution) {
    const waterMl = volumeOf(parts) * dilution.fraction;
    const m = mix(parts, waterMl);
    after = {
      volumeMl: m.volumeMl,
      waterMl,
      abvPct: figureOf(m.abv, unknown.abv),
      sugarPer100Ml: figureOf(m.sugar, unknown.sugar),
      acidPct: figureOf(m.acid, unknown.acid),
    };
  }
  return {
    before,
    after,
    sugarAcidRatio: ratio(t.sugarG, t.acidG),
    ukUnits: times(t.ethanolMl, 1 / ML_ETHANOL_PER_UK_UNIT),
  };
}
