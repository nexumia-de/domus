// A volume as the user types it, in ml: the what-if volume of a top and the
// target volume of a batch read the same text.

import { parseAmount, toBase } from '@mixtura/engine';

export type Volume = { ok: true; ml: number } | { ok: false };

/**
 * Reads what the user typed as a volume in ml: a plain number means ml,
 * a unit is converted (`3 oz`; litres, which the engine's unit table lacks, are read here: `1 l`); decimal comma accepted. Zero,
 * negative, non-volume units and more than `maxMl` are refused.
 */
export function parseVolume(text: string, maxMl: number): Volume {
  const typed = text.trim().replace(',', '.');
  // The engine's unit table has no litre: `1 l` and `1.5 litres` are read here.
  const litres = /^(\d+(?:\.\d+)?)\s*(?:l|lt|liters?|litres?)$/i.exec(typed);
  if (litres) {
    const ml = Number(litres[1]) * 1000;
    return ml > 0 && ml <= maxMl ? { ok: true, ml } : { ok: false };
  }
  const withUnit = /^[\d.\s/]+$/.test(typed) ? `${typed} ml` : typed;
  const amount = parseAmount(withUnit);
  if (!amount.ok) return { ok: false };
  const base = toBase(amount.value);
  if (!base.ok || base.value.kind !== 'volume') return { ok: false };
  const ml = base.value.value;
  return ml > 0 && ml <= maxMl ? { ok: true, ml } : { ok: false };
}
