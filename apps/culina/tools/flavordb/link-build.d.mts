import type { OwnLink } from './link.mjs';
export const FORMAT: string;
export const buildLinks: (
  catalogue: { ingredients: readonly { id: string; name: string }[] },
  pairings: {
    entities: readonly { id: number; name: string; alias: string; synonyms?: readonly string[] }[];
  },
  own: { set: readonly OwnLink[] },
) => {
  data: { format: string; formatVersion: number; about: string; links: Record<string, number> };
  problems: string[];
};
