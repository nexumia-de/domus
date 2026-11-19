// Skill state: whether the user marked one technique as learned. A stored personal record, one per
// technique, in the sync-record shape like every row (the row adds `updatedAt`).

/** The stored record: `id` is `skill-` plus the technique id. */
export interface SkillRecord {
  id: string;
  technique: string;
  learned: boolean;
}

/**
 * The record id of a technique's skill state.
 *
 * @param technique - A technique id.
 * @returns `skill-<technique>`: one record per technique, so two devices that mark the same
 * technique write the same row and merge by `updatedAt`.
 */
export const skillId = (technique: string): string => `skill-${technique}`;

/**
 * The record to write when the user marks a technique as learned or not.
 *
 * @param technique - A technique id.
 * @param learned - True for learned; false takes the mark back (the record stays).
 * @returns The record, valid against `skill.schema.json`.
 */
export const skillRecord = (technique: string, learned: boolean): SkillRecord => ({
  id: skillId(technique),
  technique,
  learned,
});

/**
 * The technique ids marked as learned. A record whose id is not the id of its technique is
 * ignored, so a stray record cannot mark a technique.
 *
 * @param records - The live skill records.
 * @returns The set of learned technique ids.
 */
export function learnedTechniques(records: readonly SkillRecord[]): Set<string> {
  return new Set(
    records.filter((r) => r.learned && r.id === skillId(r.technique)).map((r) => r.technique),
  );
}
