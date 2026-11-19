// The shipped content the screens read: the classics, the techniques and the substitutes. They are their own file,
// classics.json, fetched from the app's own origin when the app starts (the service worker has it
// precached, so it works offline); main.js carries neither. A file that is missing or does not
// fit leaves the lists empty and the app works with zero dishes. A page opened with `?e2e-content`
// may carry its own on `globalThis.__culinaContent` (set before the app loads), so the browser
// tests run on a fictional example; without that query nothing is read from there.
import type { Classic, Substitute, Technique } from '@culina/engine';

const FORMAT = 'culina-classics';

interface Content {
  classics?: readonly Classic[];
  techniques?: readonly Technique[];
  substitutes?: readonly Substitute[];
}

export type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const override = (): Content | undefined => {
  try {
    if (!new URLSearchParams(globalThis.location.search).has('e2e-content')) return undefined;
    return (globalThis as { __culinaContent?: Content }).__culinaContent;
  } catch {
    return undefined;
  }
};

/** The lists of a classics file, or undefined if it is not one. Shape is checked at build time. */
export const readContent = (file: unknown): Required<Content> | undefined => {
  if (typeof file !== 'object' || file === null) return undefined;
  const { format, formatVersion, classics, techniques, substitutes } = file as Record<
    string,
    unknown
  >;
  if (format !== FORMAT || formatVersion !== 1) return undefined;
  if (!Array.isArray(classics) || !Array.isArray(techniques)) return undefined;
  // `substitutes` came later: a file without it is still a classics file, with none.
  if (substitutes !== undefined && !Array.isArray(substitutes)) return undefined;
  return {
    classics: classics as Classic[],
    techniques: techniques as Technique[],
    substitutes: (substitutes ?? []) as Substitute[],
  };
};

let shipped: Required<Content> = { classics: [], techniques: [], substitutes: [] };

/** Loads classics.json once at start; any failure leaves the lists empty. */
export const loadContent = async (
  fetcher: Fetcher = (url) => fetch(url),
): Promise<Required<Content>> => {
  try {
    const response = await fetcher('classics.json');
    shipped = (response.ok ? readContent(await response.json()) : undefined) ?? shipped;
  } catch {
    // Offline without a cache, or a broken file: no dishes.
  }
  return shipped;
};

/** Empties the loaded lists (for tests). */
export const resetContent = (): void => {
  shipped = { classics: [], techniques: [], substitutes: [] };
};

/** Every classic that is shown. */
export const classics = (): readonly Classic[] => override()?.classics ?? shipped.classics;

/** Every technique the engine knows. */
export const techniques = (): readonly Technique[] => override()?.techniques ?? shipped.techniques;

/** Every substitute effect: what replaces an ingredient and what changes. */
export const substitutes = (): readonly Substitute[] =>
  override()?.substitutes ?? shipped.substitutes;

/** One classic by id, or `undefined`. */
export const classicOf = (id: string): Classic | undefined => classics().find((c) => c.id === id);
