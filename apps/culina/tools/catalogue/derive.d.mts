export interface Portion {
  amount: number;
  modifier?: string;
  gramWeight: number;
}
export interface Food {
  fdcId: number;
  ndbNumber?: number;
  description: string;
  foodCategory?: { description: string };
  foodPortions?: Portion[];
}
export interface Derived {
  value: number;
  portion: string;
  /** Only for a named food's volume: how the portion's unit equals the generator's, "1 fl oz = 2 tbsp". */
  equals?: string;
}
/** One entry of extras.json: a food a shipped dish names although the selection rule leaves it out. */
export interface Extra {
  id: number;
  why: string;
  volume?: { modifier: string; unit: string; per?: number }[];
  piece?: string;
}
export const isBasic: (food: Food) => boolean;
export const deriveDensity: (
  portions: Portion[],
  mlOf: (unit: string) => number,
  extra?: Extra,
) => (Derived & { unit: string }) | undefined;
export const deriveUnitWeight: (portions: Portion[], extra?: Extra) => Derived | undefined;
export const nameOf: (description: string) => string;
