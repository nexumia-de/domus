// Runs every vector in vectors/skills against the engine (docs/vectors.md): skill records.
import { describe, expect, test } from 'vitest';
import { learnedTechniques, skillRecord } from '../src/index';
import type { SkillRecord } from '../src/index';
import { loadVectors } from './vector-files';

describe('skill vectors', () => {
  for (const vector of loadVectors('skills')) {
    test(vector.id, () => {
      const i = vector.inputs;
      switch (i.kind) {
        case 'skill_record':
          return expect(skillRecord(i.technique as string, i.learned as boolean)).toEqual(
            vector.expected,
          );
        case 'skill_learned':
          return expect([...learnedTechniques(i.records as SkillRecord[])].sort()).toEqual(
            (vector.expected as { learned: string[] }).learned,
          );
        default:
          throw new Error(`${vector.id}: unknown kind ${i.kind}`);
      }
    });
  }
});
