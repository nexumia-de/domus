// Versions of a drink (docs/data-model.md#spec). Every save of changed
// content is a new record in the drink's lineage with the next number; older
// records are never written again. A change of status is not a version: it
// is written into the newest record with a line in its status log. The time
// comes in from the host so the numbering and the log stay testable.

import type { DiffSpec } from '@mixtura/engine';
import type { Ingredient, Spec } from './types';
import type { Repo } from './repo';
import type { SpecsRepo } from './repo-entities';

export interface VersionRepos {
  specs: SpecsRepo;
  ingredients: Repo<Ingredient>;
}

export interface VersionRequest {
  /** The id of the new record. */
  id: string;
  /** The instant of the save. */
  at: string;
  /** The user's one line, or the default of a riff or a restore. */
  note?: string;
}

type Status = Spec['status'];

/** A stored spec as the engine's comparison reads it. */
export const asDiffSpec = (spec: Spec): DiffSpec => spec as unknown as DiffSpec;

/** The fields a new version starts without: they belong to the version, not to the content. */
const OWN = ['id', 'version', 'note', 'statusLog', 'updatedAt'] as const;

/** The status log after a save: the older entries, and the new status when it differs. */
export function statusLogAfter(newest: Spec | undefined, status: Status, at: string): unknown[] {
  const log = (newest?.['statusLog'] as unknown[] | undefined) ?? [];
  const known =
    log.length > 0 || !newest ? log : [{ status: newest.status, at: newest.updatedAt ?? at }];
  return newest?.status === status ? known : [...known, { status, at }];
}

/**
 * Writes `content` as the next version of its lineage (version 1 when the
 * lineage has none). The version is `newest + 1`, its `parentId` the newest
 * version (a first version keeps the parent given, the spec it riffs on), its
 * `createdAt` that of the lineage. Prepared ingredients made from any version
 * of the lineage are pointed at the new id: `prepared.specId` is a spec id
 * and the engine looks the spec up by it.
 *
 * @param repos The spec and ingredient stores.
 * @param content The spec to save; version, id, note and status log are set here.
 * @param request The new id, the instant and the note.
 * @returns The record that was written.
 */
export async function appendVersion(
  repos: VersionRepos,
  content: Spec,
  request: VersionRequest,
): Promise<Spec> {
  const versions = await repos.specs.versionsOf(content.lineageId);
  const newest = versions.at(-1);
  const rest: Record<string, unknown> = Object.fromEntries(
    Object.entries(content).filter(([key]) => !OWN.includes(key as (typeof OWN)[number])),
  );
  const note = request.note?.trim();
  const spec = {
    ...rest,
    id: request.id,
    version: (newest?.version ?? 0) + 1,
    ...(newest && { parentId: newest.id }),
    ...(note && { note }),
    statusLog: statusLogAfter(newest, content.status, request.at),
    createdAt: newest?.createdAt ?? content.createdAt ?? request.at,
    updatedAt: request.at,
  } as unknown as Spec;
  await repos.specs.put(spec);
  const ids = new Set(versions.map((v) => v.id));
  for (const item of await repos.ingredients.list()) {
    if (item.prepared && ids.has(item.prepared.specId)) {
      await repos.ingredients.put({ ...item, prepared: { ...item.prepared, specId: spec.id } });
    }
  }
  return spec;
}

/**
 * Sets the status of a drink without a new version: the newest record takes
 * it and the log gets a line with the date.
 *
 * @param repos The spec store.
 * @param lineageId The drink.
 * @param status The new status.
 * @param at The instant of the change.
 * @returns The newest record as written, or undefined when the drink is unknown.
 */
export async function setStatus(
  repos: Pick<VersionRepos, 'specs'>,
  lineageId: string,
  status: Status,
  at: string,
): Promise<Spec | undefined> {
  const newest = (await repos.specs.versionsOf(lineageId)).at(-1);
  if (!newest || newest.status === status) return newest;
  const spec = { ...newest, status, statusLog: statusLogAfter(newest, status, at) } as Spec;
  await repos.specs.put(spec);
  return spec;
}

/**
 * Restores an older version as a new one: its content is copied forward with
 * the note "Restored from vN"; the status stays what the drink has now and
 * nothing of the history is rewritten.
 *
 * @param repos The spec and ingredient stores.
 * @param lineageId The drink.
 * @param version The number to restore.
 * @param request The new id and the instant; the note is set here.
 * @param note The text of the note for this version number.
 * @returns The new record, or undefined when the version does not exist.
 */
export async function restoreVersion(
  repos: VersionRepos,
  lineageId: string,
  version: number,
  request: Omit<VersionRequest, 'note'>,
  note: string,
): Promise<Spec | undefined> {
  const versions = await repos.specs.versionsOf(lineageId);
  const old = versions.find((v) => v.version === version);
  const newest = versions.at(-1);
  if (!old || !newest) return undefined;
  return appendVersion(repos, { ...old, status: newest.status }, { ...request, note });
}
