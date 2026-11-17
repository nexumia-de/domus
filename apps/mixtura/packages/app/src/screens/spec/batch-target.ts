// What a batch is made for, as data: a number of drinks or a target volume
// (docs/screens-specs.md#servings-and-batch). Both are parameters of the
// address (`servings=n`, `volume=<ml>`); with a volume the number of
// servings is the volume divided by the pour of one drink, a fraction.
// Pure; the engine's `prediluted` takes a fractional number of servings.

import { prediluted, type IngredientTree } from '@mixtura/engine';
import type { SpecLine } from '../browse/types';
import { parseVolume, type Volume } from './volume-text';

/** Most drinks a batch is made for. */
export const MAX_BATCH_DRINKS = 200;
/** Largest target volume, in ml (a barrel is out of scope). */
export const MAX_BATCH_ML = 100_000;

export type BatchTarget = { kind: 'drinks'; servings: number } | { kind: 'volume'; ml: number };

/** The target volume in the address, in ml; absent or anything but a number above 0 up to the maximum is none. */
export function volumeOf(query: URLSearchParams): number | undefined {
  const text = query.get('volume');
  if (text === null || !/^\d+(\.\d+)?$/.test(text)) return undefined;
  const ml = Number(text);
  return ml > 0 && ml <= MAX_BATCH_ML ? ml : undefined;
}

/** The parameter value of a volume: whole ml where it is whole, else up to two decimals. */
export const volumeParam = (ml: number): string => String(Math.round(ml * 100) / 100);

/** Reads a typed target volume (`1 l`, `1000`, `32 oz`). */
export const parseBatchVolume = (text: string): Volume => parseVolume(text, MAX_BATCH_ML);

/** Reads a typed number of drinks: a whole number from 1 to the maximum. */
export function parseBatchDrinks(text: string): number | undefined {
  const typed = text.trim();
  if (!/^\d+$/.test(typed)) return undefined;
  const n = Number(typed);
  return n >= 1 && n <= MAX_BATCH_DRINKS ? n : undefined;
}

/** The volume one poured serving is, ml: one diluted drink; undefined when no batch can be made. */
export function pourMl(
  tree: IngredientTree,
  method: string | undefined,
  lines: readonly SpecLine[],
): number | undefined {
  const one = prediluted(tree, { method, lines }, 1);
  return one.ok ? one.value.pourPerServingMl : undefined;
}

/** Servings in a batch of `ml`: the volume over one pour, a fraction. */
export const servingsFor = (ml: number, pour: number): number => ml / pour;
