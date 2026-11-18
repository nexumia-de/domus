// "Compare my amounts": the engine's range check shown as numbers and neutral phrases.
import { checkRatio } from '@culina/engine';
import type { EffectiveTemplate } from '@culina/engine';
import { strings } from '../strings';
import { formatNumber } from '../shared/mass';
import { parseEntry } from '../shared/parse';

export interface CompareRow {
  role: string;
  /** Empty when the cook entered nothing for this role. */
  parts: string;
  template: string;
  /** Signed difference to the template, empty when nothing was entered. */
  diff: string;
  /** The position phrase where the template has a range, "not entered" for a blank role, else empty. */
  phrase: string;
}

export type CompareView =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'needs-anchor'; anchor: string }
  | { state: 'ok'; rows: CompareRow[] };

const signed = (n: number): string =>
  n === 0 ? '0' : `${n > 0 ? '+' : '−'}${formatNumber(Math.abs(n))}`;

/** The role the other amounts are measured against: the template's anchor, else its first role. */
export const referenceRole = (template: EffectiveTemplate): string =>
  template.anchor ?? template.parts[0]?.role ?? '';

/** Reads the typed grams per role and runs the engine's range check; blank fields are left out. */
export const compareAmounts = (
  template: EffectiveTemplate,
  texts: Readonly<Record<string, string>>,
): CompareView => {
  const amounts: Record<string, number> = {};
  for (const part of template.parts) {
    const entry = parseEntry(texts[part.role] ?? '');
    if (entry.kind === 'invalid') return { state: 'invalid' };
    if (entry.kind === 'ok') amounts[part.role] = entry.value;
  }
  if (Object.keys(amounts).length === 0) return { state: 'empty' };
  const anchor = referenceRole(template);
  const result = checkRatio(template, amounts, { anchor });
  if (!result.ok) {
    return result.error.code === 'invalid-value'
      ? { state: 'invalid' }
      : { state: 'needs-anchor', anchor };
  }
  const rows = result.roles.map((r): CompareRow => {
    if (result.notUsed.includes(r.role)) {
      return {
        role: r.role,
        parts: '',
        template: formatNumber(r.templateParts),
        diff: '',
        phrase: strings.ratios.notEntered,
      };
    }
    const phrase =
      r.position === 'below'
        ? strings.ratios.below(formatNumber(r.distance ?? 0))
        : r.position === 'above'
          ? strings.ratios.above(formatNumber(r.distance ?? 0))
          : r.position === 'within'
            ? strings.ratios.within
            : '';
    return {
      role: r.role,
      parts: formatNumber(r.parts),
      template: formatNumber(r.templateParts),
      diff: signed(r.deltaParts),
      phrase,
    };
  });
  return { state: 'ok', rows };
};
