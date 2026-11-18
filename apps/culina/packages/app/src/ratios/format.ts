// Display of a ratio in short form.
import type { EffectivePart } from '@culina/engine';
import { formatNumber } from '../shared/mass';

/** "3 : 2 : 1" and "flour : fat : water", in template order. */
export const shortRatio = (
  parts: readonly Pick<EffectivePart, 'role' | 'parts'>[],
): { numbers: string; roles: string } => ({
  numbers: parts.map((p) => formatNumber(p.parts)).join(' : '),
  roles: parts.map((p) => p.role).join(' : '),
});
