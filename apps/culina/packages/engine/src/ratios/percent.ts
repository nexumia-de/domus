// A template's parts as percent of its anchor.
import type { EffectiveTemplate, PercentResult } from './types';

/**
 * Each role as percent of the anchor: parts / anchor parts * 100, so the
 * anchor is 100.
 *
 * @param template - A resolved template.
 * @returns Percent by role, or `no-anchor` when the template has none.
 */
export function templatePercent(template: EffectiveTemplate): PercentResult {
  const anchorPart = template.parts.find((p) => p.role === template.anchor);
  if (anchorPart === undefined) return { ok: false, error: { code: 'no-anchor' } };
  return {
    ok: true,
    pct: Object.fromEntries(
      template.parts.map((p) => [p.role, (100 * p.parts) / anchorPart.parts]),
    ),
  };
}
