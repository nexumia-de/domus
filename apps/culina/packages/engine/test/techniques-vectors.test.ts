// Runs every vector in vectors/techniques against the engine (docs/vectors.md): technique
// validation and which notes show along steps.
import { describe, expect, test } from 'vitest';
import { techniqueNotes, validateTechnique, validateTechniques } from '../src/index';
import type { Step, Technique } from '../src/index';
import { expectValidation } from './content-vectors';
import { expectError, loadVectors } from './vector-files';
import type { Vector } from './vector-files';

function notes(vector: Vector): void {
  const i = vector.inputs as unknown as {
    steps: Step[];
    techniques: Technique[];
    learned: string[];
  };
  const result = techniqueNotes(i.steps, i.techniques, new Set(i.learned));
  if (vector.error_code !== undefined) return expectError(result, vector);
  if (!result.ok) throw new Error(`${vector.id}: ${result.error.code}`);
  const e = vector.expected as { notes: { step: number; technique: string }[] };
  expect(result.notes.map((n) => ({ step: n.step, technique: n.technique.id }))).toEqual(e.notes);
}

describe('technique vectors', () => {
  for (const vector of loadVectors('techniques')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'technique_validate':
          return expectValidation(validateTechnique(i.technique as Technique), vector);
        case 'technique_list_validate':
          return expectValidation(validateTechniques(i.techniques as Technique[]), vector);
        case 'technique_notes':
          return notes(vector);
        default:
          throw new Error(`${vector.id}: unknown kind ${i.kind}`);
      }
    });
  }
});
