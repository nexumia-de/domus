// Seed data: shipped with the app as one read-only JSON file, held in
// memory, never copied into IndexedDB. The file's content comes from the
// seed issues (#13); its shape is fixed here, against docs/data-model.md.
//
//   { "seedVersion": "<version or commit>",
//     "ingredients": [Ingredient], "templates": [Template],
//     "specs": [Spec], "affinities": [Affinity],
//     "replacedBy": { "<dropped id>": "<new id>" },  (optional)
//     "vocabulary": { "methods": [{id,name}], "glasses": [{id,name}] },  (optional)
//     "attribution": { "notice": "...", ... } }  (optional)

import { StoreError } from './errors';
import type { Affinity, Ingredient, Spec, Template } from './types';

/** Names of methods and glasses (the ids a spec uses). */
export interface Vocabulary {
  methods: { id: string; name: string }[];
  glasses: { id: string; name: string }[];
}

/** Where the seed data comes from; `notice` is the text About shows. */
export interface Attribution {
  source: string;
  repository: string;
  commit: string;
  licence: string;
  holder: string;
  notice: string;
}

export interface Seed {
  seedVersion: string;
  ingredients: Ingredient[];
  templates: Template[];
  specs: Spec[];
  affinities: Affinity[];
  replacedBy: Record<string, string>;
  vocabulary: Vocabulary;
  attribution?: Attribution;
}

export const SEED_URL = 'seed/seed.json';

export const emptySeed: Seed = {
  seedVersion: 'none',
  ingredients: [],
  templates: [],
  specs: [],
  affinities: [],
  replacedBy: {},
  vocabulary: { methods: [], glasses: [] },
};

const COLLECTIONS = ['ingredients', 'templates', 'specs', 'affinities'] as const;

/** Checks the shape (not the entities: the seed build validates those). */
export function parseSeed(data: unknown): Seed {
  const bad = (why: string): never => {
    throw new StoreError('seed', `The built-in data is malformed: ${why}`);
  };
  if (!data || typeof data !== 'object') return bad('not an object');
  const record = data as Record<string, unknown>;
  if (typeof record['seedVersion'] !== 'string' || !record['seedVersion']) {
    bad('seedVersion is missing');
  }
  const seed: Seed = { ...emptySeed, seedVersion: record['seedVersion'] as string };
  for (const name of COLLECTIONS) {
    const list = record[name];
    if (!Array.isArray(list)) return bad(`${name} is not a list`);
    const ids = new Set<string>();
    for (const item of list as { id?: unknown }[]) {
      if (typeof item?.id !== 'string') return bad(`an entry of ${name} has no id`);
      if (ids.has(item.id)) return bad(`${name} has the id ${item.id} twice`);
      ids.add(item.id);
    }
    (seed[name] as unknown[]) = list;
  }
  const replaced = record['replacedBy'];
  if (replaced !== undefined) {
    if (!replaced || typeof replaced !== 'object') return bad('replacedBy is not an object');
    seed.replacedBy = replaced as Record<string, string>;
  }
  const vocabulary = record['vocabulary'];
  if (vocabulary !== undefined) {
    const v = vocabulary as Partial<Vocabulary> | null;
    if (!v || !Array.isArray(v.methods) || !Array.isArray(v.glasses)) {
      bad('vocabulary needs the lists methods and glasses');
    }
    seed.vocabulary = vocabulary as Vocabulary;
  }
  const attribution = record['attribution'];
  if (attribution !== undefined) {
    if (!attribution || typeof (attribution as Attribution).notice !== 'string') {
      bad('attribution needs a notice');
    }
    seed.attribution = attribution as Attribution;
  }
  return seed;
}

export async function loadSeed(
  fetcher: typeof fetch = fetch,
  url: string = SEED_URL,
): Promise<Seed> {
  let data: unknown;
  try {
    const response = await fetcher(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (error) {
    throw new StoreError('seed', `The built-in data did not load: ${(error as Error).message}`);
  }
  return parseSeed(data);
}
