// Scaling a template from one measured role.
import type { EffectiveTemplate, ScaleAnchorResult } from './types';

/**
 * Grams of every role when one role's grams are known:
 * g_role = g * parts_role / parts_of_the_known_role.
 *
 * @param template - A resolved template.
 * @param role - The role that was weighed.
 * @param g - Its grams; finite and greater than 0.
 * @returns Grams by role, or `unknown-role` or `invalid-value`.
 */
export function scaleFromAnchor(
  template: EffectiveTemplate,
  role: string,
  g: number,
): ScaleAnchorResult {
  const known = template.parts.find((p) => p.role === role);
  if (known === undefined) return { ok: false, error: { code: 'unknown-role', role } };
  if (!Number.isFinite(g) || g <= 0) return { ok: false, error: { code: 'invalid-value', role } };
  const out = Object.fromEntries(template.parts.map((p) => [p.role, (g * p.parts) / known.parts]));
  if (!Object.values(out).every(Number.isFinite)) {
    return { ok: false, error: { code: 'invalid-value', role } };
  }
  return { ok: true, g: out };
}
