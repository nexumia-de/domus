// Cycles between components, found by the engine's cross-record validation (ids only).
import { validateModel } from '@culina/engine';
import type { ComponentRef } from '@culina/engine';

interface Candidate {
  id: string;
  lines: readonly { ref: ComponentRef }[];
}

/** True when `candidate`, in place of its stored version, is part of a cycle of components. */
export const inCycle = (stored: readonly Candidate[], candidate: Candidate): boolean => {
  const others = stored.filter((c) => c.id !== candidate.id);
  const found = validateModel({ components: [...others, candidate] });
  return found.findings.some((f) => f.code === 'cycle' && (f.ids ?? []).includes(candidate.id));
};

/** True when `self` taking a line that uses `sub` would close a cycle (also `sub` = `self`). */
export const wouldCycle = (stored: readonly Candidate[], self: Candidate, sub: string): boolean =>
  inCycle(stored, { id: self.id, lines: [...self.lines, { ref: { kind: 'component', id: sub } }] });
