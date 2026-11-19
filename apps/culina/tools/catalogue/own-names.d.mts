export interface OwnNamesOverlay {
  dataset: { name: string; file: string; date: string; licence: string };
  uncertain?: Record<string, string>;
  names: Record<string, { name: string; aliases?: string[] }>;
}

export const OWN_SOURCE_PREFIX: string;
export const ownSource: (date: string) => string;
export const isOwnName: (entry: { source?: string } | undefined) => boolean;
export const mergeOwnNames: <T extends { id: string; names?: Record<string, unknown> }>(
  ingredients: readonly T[],
  overlay: Pick<OwnNamesOverlay, 'names'> & { dataset: { date: string } },
) => { ingredients: T[]; merged: number; keptOther: number; unknown: string[] };
export const ownNamesDataset: (
  overlay: OwnNamesOverlay,
  sha256: string,
) => { name: string; file: string; sha256: string; retrieved: string; licence: string };
