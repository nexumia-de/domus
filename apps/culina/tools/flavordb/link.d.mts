export interface OwnLink {
  name: string;
  entity: string | null;
  why: string;
  fallback?: boolean;
}
export const CONTAINERS: Set<string>;
export const keyOf: (name: string) => string;
export const keysFor: (name: string) => string[];
export const linkCatalogue: (
  ingredients: readonly { id: string; name: string }[],
  entities: readonly { id: number; name: string; alias: string; synonyms?: readonly string[] }[],
  own?: { set: readonly OwnLink[] },
) => { links: Record<string, number>; problems: string[] };
