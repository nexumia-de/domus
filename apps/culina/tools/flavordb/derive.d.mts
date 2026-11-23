export interface PairingEntity {
  id: number;
  alias: string;
  name: string;
  category: string;
  molecules: number[];
  synonyms?: string[];
}
export interface PairingMolecule {
  name: string;
  flavours: string[];
}
export interface PairingData {
  format: string;
  formatVersion: number;
  dataset: {
    name: string;
    url: string;
    licence: string;
    citation: string;
    fetched: string;
    changes: string;
  };
  entities: PairingEntity[];
  molecules: Record<string, PairingMolecule>;
}
export const FORMAT: string;
export const FORMAT_VERSION: number;
export const LICENCE: string;
export const CITATION: string;
export const flavourWords: (profile: unknown) => string[];
export const synonymsOf: (doc: unknown) => string[];
export const deriveEntity: (
  doc: unknown,
) =>
  | { entity: PairingEntity; molecules: [number, PairingMolecule][]; error?: undefined }
  | { error: string; entity?: undefined; molecules?: undefined };
export const deriveDataset: (
  docs: readonly unknown[],
  meta: { fetched: string },
) => { data: PairingData; problems: string[] };
