// Range check of a recipe's amounts against a template: numbers, never a verdict.
import type {
  EffectiveTemplate,
  RangePosition,
  RoleCheck,
  CheckResult,
  RatioErrorCode,
} from './types';

/** Trims binary noise to 12 significant digits, so a value on a bound is on it. */
const trim = (n: number): number => Number(n.toPrecision(12));

const fail = (code: RatioErrorCode, role?: string): CheckResult => ({
  ok: false,
  error: role === undefined ? { code } : { code, role },
});

/** Where parts lie against a range, and how far outside it (bounds inclusive). */
function against(
  parts: number,
  min: number,
  max: number,
): { position: RangePosition; distance: number } {
  const lo = trim(min);
  const hi = trim(max);
  if (parts < lo) return { position: 'below', distance: trim(lo - parts) };
  if (parts > hi) return { position: 'above', distance: trim(parts - hi) };
  return { position: 'within', distance: 0 };
}

/**
 * Compares a recipe's amounts with a template, role by role. The amounts
 * are normalised so that the anchor has its template parts; a role with a
 * range gets `position` and `distance` against it. Values are trimmed to
 * 12 significant digits. The result states numbers and positions only; it
 * never says that a recipe is right or wrong.
 *
 * @param template - A resolved template.
 * @param amounts - Grams by role id; finite and not negative.
 * @param options - `anchor` overrides the template's anchor role.
 * @returns Per template role (template order) the actual and template parts, the difference, both shares, and position and distance where a range exists; plus `notUsed` (template roles without an amount, counted as 0 parts) and `extra` (given roles the template lacks). Or `no-anchor`, `unknown-anchor`, `anchor-not-measured` (anchor amount absent or 0) or `invalid-value` (with the role).
 */
export function checkRatio(
  template: EffectiveTemplate,
  amounts: Readonly<Record<string, number>>,
  options: { anchor?: string } = {},
): CheckResult {
  const anchor = options.anchor ?? template.anchor;
  if (anchor === undefined) return fail('no-anchor');
  const anchorPart = template.parts.find((p) => p.role === anchor);
  if (anchorPart === undefined) return fail('unknown-anchor', anchor);
  for (const [role, g] of Object.entries(amounts)) {
    if (!Number.isFinite(g) || g < 0) return fail('invalid-value', role);
  }
  const anchorG = amounts[anchor] ?? 0;
  if (anchorG === 0) return fail('anchor-not-measured', anchor);
  const totalG = Object.values(amounts).reduce((sum, g) => sum + g, 0);
  if (!Number.isFinite(totalG)) return fail('invalid-value');
  const templateTotal = template.parts.reduce((sum, p) => sum + p.parts, 0);
  const roles: RoleCheck[] = template.parts.map((p) => {
    const parts = trim(((amounts[p.role] ?? 0) * anchorPart.parts) / anchorG);
    const row: RoleCheck = {
      role: p.role,
      parts,
      templateParts: p.parts,
      deltaParts: trim(parts - p.parts),
      sharePct: (100 * (amounts[p.role] ?? 0)) / totalG,
      templateSharePct: (100 * p.parts) / templateTotal,
    };
    if (p.range === undefined) return row;
    return { ...row, range: { ...p.range }, ...against(parts, p.range.min, p.range.max) };
  });
  const overflow = roles.find(
    (r) => !Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v)),
  );
  if (overflow) return fail('invalid-value', overflow.role);
  const known = new Set(template.parts.map((p) => p.role));
  return {
    ok: true,
    anchor,
    roles,
    notUsed: template.parts.filter((p) => amounts[p.role] === undefined).map((p) => p.role),
    extra: Object.keys(amounts).filter((role) => !known.has(role)),
  };
}
