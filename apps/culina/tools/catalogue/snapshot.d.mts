import type { Snapshot } from './wikidata.mjs';

export interface Cell {
  value: string;
}
export type Binding = Record<string, Cell | undefined>;
export const SEPARATOR: string;
export const instancesOf: (binding: Binding) => string[];
export const classesQuery: (items: Binding[]) => string;
export const buildSnapshot: (
  items: Binding[],
  classLabels: Record<string, string>,
  catalogueNdbs: Set<string>,
  date: string,
  query: string,
) => Snapshot & { responseRows: number; keptRows: number };
export const serialiseSnapshot: (snapshot: Snapshot) => string;
