// A source line's unit string to an engine unit id, using the engine's own
// parser so the converter cannot disagree with the amounts module.
import { parseAmount } from '../../packages/engine/src/index';

/** Source spellings that name an engine unit under another symbol. */
const ALIASES: Record<string, string> = { topup: 'top' };

export type MappedUnit = { ok: true; unit: string } | { ok: false; reason: string };

export function mapUnit(units: string, ingredientId: string): MappedUnit {
  const word = ALIASES[units] ?? units;
  const parsed = parseAmount(`1 ${word}`, { solid: ingredientId === 'sugar' });
  if (!parsed.ok) return { ok: false, reason: `unit "${units}"` };
  return { ok: true, unit: parsed.value.unit };
}
