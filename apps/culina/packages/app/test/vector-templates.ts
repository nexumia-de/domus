// Reads engine vectors from disk (not through the engine) for the app's calculator tests.
import { readFileSync } from 'node:fs';
import type { EffectiveTemplate, PartRange } from '@culina/engine';

interface Inline {
  name: string;
  anchor?: string;
  parts: Record<string, number>;
  ranges?: Record<string, PartRange>;
}

export interface Vector {
  id: string;
  inputs: Record<string, unknown> & { template: Inline };
  expected: Record<string, Record<string, unknown>>;
  tolerance: number;
}

export const readVector = (id: string): Vector =>
  JSON.parse(
    readFileSync(
      new URL(`../../engine/vectors/ratios/templates/${id}.json`, import.meta.url),
      'utf8',
    ),
  ) as Vector;

/** The inline template of a vector as an effective template (roles in the vector's order). */
export const effectiveOf = (template: Inline): EffectiveTemplate => ({
  id: template.name,
  ...(template.anchor === undefined ? {} : { anchor: template.anchor }),
  lineage: [template.name],
  parts: Object.entries(template.parts).map(([role, parts]) => {
    const range = template.ranges?.[role];
    return range === undefined ? { role, parts } : { role, parts, range };
  }),
});
