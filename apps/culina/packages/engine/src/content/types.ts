// Findings of the content validators (techniques, steps, classics). Content is
// checked by the JSON Schemas for its shape; these are the rules that span
// fields or records. Validators never throw: they return the findings.

/** What a content finding says. */
export type ContentFindingCode =
  | 'text-incomplete'
  | 'sentence-too-long'
  | 'no-source'
  | 'unknown-level'
  | 'duplicate-id'
  | 'duplicate-key'
  | 'unknown-technique'
  | 'unknown-action'
  | 'technique-and-action'
  | 'step-empty'
  | 'unknown-line'
  | 'unknown-unit'
  | 'unit-shadows'
  | 'unused-unit'
  | 'unit-kind'
  | 'bad-range'
  | 'amount-word'
  | 'unknown-ingredient'
  | 'same-ingredient'
  | 'unknown-component'
  | 'unused-component'
  | 'reserved-id'
  | 'cycle'
  | 'settled-without-entry'
  | 'settled-target'
  | 'persons-unsettled'
  | 'persons-entry';

/** One problem: its code, where it is (`components[1].lines[0].amount`) and the value involved. */
export interface ContentFinding {
  code: ContentFindingCode;
  path: string;
  /** The offending id, key or unit word, where one exists. */
  value?: string;
}

/** Result of a content validator. */
export type ContentResult =
  { ok: true } | { ok: false; error: { code: 'invalid'; findings: ContentFinding[] } };

/** Wraps findings in the result union: `ok` when there are none. */
export function contentResult(findings: ContentFinding[]): ContentResult {
  return findings.length === 0 ? { ok: true } : { ok: false, error: { code: 'invalid', findings } };
}

/** A finding with `value` only when there is one. */
export function found(code: ContentFindingCode, path: string, value?: string): ContentFinding {
  return value === undefined ? { code, path } : { code, path, value };
}
