export interface SnapshotRow {
  item: string;
  ndb: string;
  ndbCount: number;
  de?: string;
  deAliases?: string[];
  en?: string;
  instanceOf: string[];
}
export interface Snapshot {
  retrieved: string;
  taxonClasses: Record<string, string>;
  items: SnapshotRow[];
}
export interface NamesEntry {
  name: string;
  aliases?: string[];
  source: string;
}
export type Names = Record<string, NamesEntry>;
export const LANG: string;
export const REASONS: string[];
export const normaliseNdb: (value: unknown) => string | undefined;
export const looksScientific: (label: string) => boolean;
export const wordsOf: (text: string) => string[];
export const labelInDescription: (label: string, description: string) => boolean;
export const labelIsFirstSegment: (label: string, description: string) => boolean;
export const cleanAliases: (aliases: readonly string[], label: string) => string[];
export const germanNames: (
  foods: { fdcId: number; ndbNumber?: number; description: string }[],
  snapshot: Snapshot,
) => {
  found: Map<number, { item: string; taxon: boolean; names: Names }>;
  counts: Record<string, number>;
};
