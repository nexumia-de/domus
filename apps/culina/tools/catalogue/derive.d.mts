export interface Portion {
  amount: number;
  modifier?: string;
  gramWeight: number;
}
export interface Food {
  fdcId: number;
  description: string;
  foodCategory?: { description: string };
  foodPortions?: Portion[];
}
export interface Derived {
  value: number;
  portion: string;
}
export const isBasic: (food: Food) => boolean;
export const deriveDensity: (
  portions: Portion[],
  mlOf: (unit: string) => number,
) => (Derived & { unit: string }) | undefined;
export const deriveUnitWeight: (portions: Portion[]) => Derived | undefined;
export const nameOf: (description: string) => string;
