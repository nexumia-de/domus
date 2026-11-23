// The pairing data shipped with the app: two files of their own, fetched from the app's own
// origin the first time a dish's "Goes with" is opened (the service worker has them precached,
// so it works offline). `pairings.json` is derived from FlavorDB (CC BY-NC-SA 3.0),
// `pairing-links.json` says which of its entities stands for an ingredient of the catalogue
// (docs/decisions/flavordb.md). A file that is not what it should be counts as not loaded.
import { moleculeWeights, pairingBaselines } from '@culina/engine';
import type { PairingBaseline, PairingData } from '@culina/engine';

export const PAIRINGS_FORMAT = 'culina-flavour-pairings';
export const LINKS_FORMAT = 'culina-flavour-links';

export type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/** What a lookup needs, with what is computed once for all dishes. */
export interface LoadedPairings {
  data: PairingData;
  /** Catalogue ingredient id to entity id. */
  links: ReadonlyMap<string, number>;
  /** The entities an ingredient of the catalogue stands for: the ones the app can name. */
  candidates: ReadonlySet<number>;
  weights: ReadonlyMap<number, number>;
  baselines: ReadonlyMap<number, PairingBaseline>;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The data of a pairings file; undefined if it is not one. */
export const readPairings = (file: unknown): PairingData | undefined => {
  if (!isObject(file) || file['format'] !== PAIRINGS_FORMAT || file['formatVersion'] !== 1)
    return undefined;
  const { entities, molecules } = file;
  if (!Array.isArray(entities) || !isObject(molecules)) return undefined;
  const ok = (entities as unknown[]).every(
    (e) =>
      isObject(e) &&
      Number.isInteger(e['id']) &&
      typeof e['name'] === 'string' &&
      typeof e['category'] === 'string' &&
      Array.isArray(e['molecules']),
  );
  return ok ? (file as unknown as PairingData) : undefined;
};

/** The links of a links file; undefined if it is not one. */
export const readLinks = (file: unknown): Map<string, number> | undefined => {
  if (!isObject(file) || file['format'] !== LINKS_FORMAT || file['formatVersion'] !== 1)
    return undefined;
  const { links } = file;
  if (!isObject(links)) return undefined;
  const out = new Map<string, number>();
  for (const [id, entity] of Object.entries(links)) {
    if (!Number.isInteger(entity)) return undefined;
    out.set(id, entity as number);
  }
  return out;
};

/** Puts the two files together and computes what every lookup shares. */
export const preparePairings = (
  data: PairingData,
  links: ReadonlyMap<string, number>,
): LoadedPairings => {
  const candidates = new Set(links.values());
  const weights = moleculeWeights(data);
  return {
    data,
    links,
    candidates,
    weights,
    baselines: pairingBaselines(data, candidates, {}, weights),
  };
};

let loaded: Promise<LoadedPairings | undefined> | undefined;

/**
 * The pairing data, loaded once; a load that did not work is tried again the next time. The
 * result is undefined when a file cannot be fetched or read.
 */
export const loadPairings = (
  fetcher: Fetcher = (url) => fetch(url),
): Promise<LoadedPairings | undefined> => {
  const get = (url: string): Promise<unknown> =>
    fetcher(url).then((response) => (response.ok ? response.json() : undefined));
  loaded ??= Promise.all([get('pairings.json'), get('pairing-links.json')])
    .then(([pairings, linkFile]) => {
      const data = readPairings(pairings);
      const links = readLinks(linkFile);
      return data === undefined || links === undefined ? undefined : preparePairings(data, links);
    })
    .catch(() => undefined)
    .then((result) => {
      if (result === undefined) loaded = undefined;
      return result;
    });
  return loaded;
};

/** Forgets what was loaded (for tests). */
export const resetPairings = (): void => {
  loaded = undefined;
};
