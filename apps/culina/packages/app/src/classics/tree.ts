// The catalogue's ingredient tree as the engine reads it: each ingredient and group with its parent.
import { catalogueEntries } from './names';

export interface TreeEntry {
  id: string;
  parentId?: string;
}

/** The shipped catalogue's ingredients and groups with their parents; empty until it is loaded. */
export const catalogueTree = (): TreeEntry[] =>
  [...catalogueEntries().values()].map((e) => ({
    id: e.id,
    ...(e.parentId === undefined ? {} : { parentId: e.parentId }),
  }));
