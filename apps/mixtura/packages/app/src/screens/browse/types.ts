// The shapes the browse screens read: the engine's types for ingredients and
// templates, and the spec as the data model stores it (docs/data-model.md).

import type { Role } from '@mixtura/engine';

export type { Ingredient, Role, Template } from '@mixtura/engine';

export interface SpecLine {
  ingredientId: string;
  amount: number;
  amountMax?: number;
  unit: string;
  /** Volume of a `top` line in ml, only with `unit: top` (docs/data-model.md). */
  topMl?: number;
  role?: Role;
  optional?: boolean;
  note?: string;
  substitutes?: { ingredientId: string; amount?: number; unit?: string }[];
}

export interface SpecData {
  id: string;
  lineageId: string;
  version: number;
  parentId?: string;
  name: string;
  templateId?: string;
  lines: SpecLine[];
  method?: string;
  glass?: string;
  garnish?: string;
  notes?: string;
  tags?: string[];
  status: 'draft' | 'on-menu' | 'retired';
  source?: { name: string; licence: string; url?: string; note?: string };
}
