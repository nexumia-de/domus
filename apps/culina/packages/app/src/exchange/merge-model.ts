// What a merge needs before anything is written: which ingredients of the file may already be in
// the notebook under another id, and the plan (added, same, conflicts) once those are decided.
import {
  matchIngredients,
  planMerge,
  remapIngredients,
  EXPORT_KINDS,
  type Candidate,
  type FullRecordSets,
  type MergePlan,
  type NameMatch,
} from '@culina/engine';

export interface FileMatch {
  /** The id of the ingredient in the file. */
  fileId: string;
  name: string;
  match: NameMatch;
  /** The exact match first, then the close ones. */
  options: Candidate[];
}

/**
 * The ingredients of the file whose id the notebook does not know but whose name it does:
 * for each, the exact match (to be preselected) and the close ones. An ingredient with no
 * proposal is not listed: it is simply added.
 */
export function proposeMatches(
  file: FullRecordSets,
  mine: FullRecordSets,
  candidates: readonly Candidate[],
): FileMatch[] {
  const known = new Set(mine.ingredients.map((r) => r.id));
  const unknown = file.ingredients.filter((r) => !known.has(r.id));
  const matches = matchIngredients(
    unknown.map((r) => String(r.name)),
    candidates,
  );
  return unknown.flatMap((r, i): FileMatch[] => {
    const match = matches[i];
    if (match === undefined) return [];
    const options = [...(match.exact ? [match.exact] : []), ...match.close];
    return options.length === 0 ? [] : [{ fileId: r.id, name: String(r.name), match, options }];
  });
}

export interface MergeSetup {
  plan: MergePlan;
  /** The file's records after the user's matches were applied. */
  file: FullRecordSets;
}

/** `chosen` maps an ingredient id of the file to the notebook ingredient it stands for. */
export function setupMerge(
  file: FullRecordSets,
  mine: FullRecordSets,
  chosen: ReadonlyMap<string, string>,
): MergeSetup {
  const remapped = chosen.size === 0 ? file : remapIngredients(file, chosen);
  return { plan: planMerge(mine, remapped), file: remapped };
}

export const countRecords = (sets: FullRecordSets): number =>
  EXPORT_KINDS.reduce((n, kind) => n + sets[kind].length, 0);
