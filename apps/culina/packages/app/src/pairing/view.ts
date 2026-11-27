// What the "Goes with" section of a dish shows: for the ingredients of the dish that the
// pairing data knows, the ingredients of the catalogue that stand out with them, each with the
// names of the dish's ingredients it goes with. And the fit of every candidate with what is in
// the pan, in bands, for "Cooking now". Pure but for the names it is given.
import { pairingFit, pairingsForDish } from '@culina/engine';
import type { FitBand, FitItem } from '@culina/engine';
import { chainOf, provenWith, type AffinityTable } from './affinity';
import type { LoadedPairings } from './load';

/** One line of a dish as the section needs it: the catalogue ingredient and the name shown. */
export interface PairingLine {
  ingredient: string;
  name: string;
}

export interface PairingRow {
  /** The catalogue ingredient offered. */
  ingredient: string;
  name: string;
  /** The names of the dish's lines it goes with, the strongest first. */
  with: string[];
}

export type PairingView =
  /** None of the dish's ingredients is in the pairing data. */
  | { kind: 'unknown' }
  /** Known, and nothing stands out. */
  | { kind: 'none' }
  | { kind: 'rows'; rows: PairingRow[] };

export interface PairingNames {
  /** The id of the ingredient's parent in the catalogue or the notebook; undefined at the top. */
  parentOf: (id: string) => string | undefined;
  /** The name of a catalogue ingredient in the content language. */
  nameOf: (id: string) => string;
}

/** How many ingredients the section offers. */
export const PAIRING_ROWS = 8;
/** How many of the dish's ingredients a row names. */
const WITH_NAMES = 3;

/** The entity of an ingredient: its own link, else that of the nearest ancestor that has one. */
export function entityOf(
  id: string,
  loaded: LoadedPairings,
  parentOf: PairingNames['parentOf'],
): number | undefined {
  const seen = new Set<string>();
  for (let at: string | undefined = id; at !== undefined && !seen.has(at); at = parentOf(at)) {
    seen.add(at);
    const entity = loaded.links.get(at);
    if (entity !== undefined) return entity;
  }
  return undefined;
}

/**
 * The catalogue ingredient that names an entity: of those linked to it, a group before a single
 * food, then the shortest id, then the id; so "Apples" stands for the apple, not one variety.
 */
export function namedBy(loaded: LoadedPairings): Map<number, string> {
  const rank = (id: string): [number, number, string] => [
    id.startsWith('fdc-group-') ? 0 : 1,
    id.length,
    id,
  ];
  const better = (a: string, b: string): boolean => {
    const x = rank(a);
    const y = rank(b);
    return x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2];
  };
  const out = new Map<number, string>();
  for (const [id, entity] of loaded.links) {
    const known = out.get(entity);
    if (known === undefined || better(id, known)) out.set(entity, id);
  }
  return out;
}

/** The view for the lines of a dish. */
export function pairingView(
  lines: readonly PairingLine[],
  loaded: LoadedPairings,
  names: PairingNames,
): PairingView {
  // The first line that stands for an entity names it.
  const lineOf = new Map<number, string>();
  for (const line of lines) {
    const entity = entityOf(line.ingredient, loaded, names.parentOf);
    if (entity !== undefined && !lineOf.has(entity)) lineOf.set(entity, line.name);
  }
  if (lineOf.size === 0) return { kind: 'unknown' };
  const found = pairingsForDish(
    [...lineOf.keys()],
    loaded.data,
    { limit: PAIRING_ROWS },
    loaded.candidates,
    loaded.weights,
    loaded.baselines,
  );
  if (found.length === 0) return { kind: 'none' };
  const named = namedBy(loaded);
  const rows: PairingRow[] = [];
  for (const pairing of found) {
    const ingredient = named.get(pairing.id);
    if (ingredient === undefined) continue;
    rows.push({
      ingredient,
      name: names.nameOf(ingredient),
      with: pairing.with
        .slice(0, WITH_NAMES)
        .map((id) => lineOf.get(id))
        .filter((name): name is string => name !== undefined),
    });
  }
  return rows.length === 0 ? { kind: 'none' } : { kind: 'rows', rows };
}

/** One ingredient with its fit to the pan; the score is not shown (decisions/daily-helper.md). */
export interface FitRow {
  ingredient: string;
  name: string;
  /** `none` when the data cannot say: no data, never a bad fit. */
  band: FitBand;
  /** The names of the pan's lines it goes with, the strongest first. */
  with: string[];
  /** The names of the pan's lines the project's own table pairs it with ("Proven together"). */
  proven: string[];
}

export interface FitView {
  /** Whether the data knows an ingredient of the pan; when not, every row has the band `none`. */
  known: boolean;
  rows: FitRow[];
}

/**
 * How well each candidate fits with the lines of the pan (`pairingFit`): by band, the strongest
 * first, the candidates the data cannot speak for last, each in the order given. A candidate that
 * is in the pan, as itself, as the group of a line or as a member of one, is left out.
 */
export function fitView(
  lines: readonly PairingLine[],
  candidates: readonly string[],
  loaded: LoadedPairings,
  names: PairingNames,
  table: AffinityTable,
): FitView {
  const nameOf = new Map<string, string>();
  for (const line of lines)
    if (!nameOf.has(line.ingredient)) nameOf.set(line.ingredient, line.name);
  const inPan = new Set(lines.flatMap((line) => chainOf(line.ingredient, names.parentOf)));
  const pan: FitItem[] = [...nameOf.keys()].map((key) => ({
    key,
    entity: entityOf(key, loaded, names.parentOf),
  }));
  const offered: FitItem[] = candidates
    .filter((id) => !inPan.has(id) && !chainOf(id, names.parentOf).some((at) => nameOf.has(at)))
    .map((key) => ({ key, entity: entityOf(key, loaded, names.parentOf) }));
  const fits = pairingFit(
    pan,
    offered,
    loaded.data,
    { proven: (candidate, line) => provenWith(candidate, line, table, names.parentOf) },
    loaded.weights,
    loaded.baselines,
  );
  const lineNames = (keys: readonly string[]): string[] =>
    keys.slice(0, WITH_NAMES).map((key) => nameOf.get(key) as string);
  const known = pan.some((item) =>
    loaded.data.entities.some((e) => e.id === item.entity && e.molecules.length > 0),
  );
  return {
    known,
    rows: fits.map((fit) => ({
      ingredient: fit.key,
      name: names.nameOf(fit.key),
      band: fit.band,
      with: lineNames(fit.with),
      proven: lineNames(fit.proven),
    })),
  };
}
