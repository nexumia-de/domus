import type { RefuseMap } from './build.mjs';
import type { Food } from './derive.mjs';

export const REFUSE_SOURCE: string;
export const readRefuse: (text: string) => RefuseMap;
export const deriveYields: (
  food: Food,
  refuse: RefuseMap,
) => { state: 'raw'; percent: number; source: string }[] | undefined;
