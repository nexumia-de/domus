// Writes of the version model. No function here writes a stored version record again: Save,
// Restore and Make a variation each add a new record, and the whole family goes away or comes
// back together (a user's delete of the whole thing, not an edit of history). Tasting notes are
// records of their own and may be added and changed.
import type { CookedRecord } from '@culina/engine';
import { fail, type Result } from '../store/types';
import type { ComponentRecord, DishRecord, TastingRecord } from '../records';
import { removeRecord, saveRecord } from './actions';
import { removeCookedOf, restoreCooked } from './cooked';
import { newId } from './ids';
import { state, today } from './state';
import { headOfFamily, versionChain, versionRecord, type VersionKind } from './versions';

type Versioned = ComponentRecord | DishRecord;

/** Everything a delete of a whole family took out, for Undo. */
export interface RemovedFamily {
  kind: VersionKind;
  versions: Versioned[];
  tastings: TastingRecord[];
  /** The day a dish was last cooked, when one was kept. */
  cooked?: CookedRecord;
}

/** Adds a tasting note, or changes one that is stored (same id). */
export const saveTasting = (record: TastingRecord): Promise<Result> =>
  saveRecord('tastings', record);

/** Removes one tasting note (a tombstone); the result carries it, for Undo. */
export const removeTasting = async (id: string): Promise<Result<{ removed: TastingRecord }>> =>
  removeRecord('tastings', id);

/**
 * Deletes a whole component or dish: every version record, every note on one and, for a dish, the
 * day it was last cooked.
 */
export const removeFamily = async (
  kind: VersionKind,
  id: string,
): Promise<Result<{ removed: RemovedFamily }>> => {
  const versions = versionChain(kind, id) as Versioned[];
  if (versions.length === 0) return fail({ code: 'not-found' });
  const ids = new Set(versions.map((v) => v.id));
  const tastings = state.tastings.filter((t) => ids.has(t.ref.id));
  const removed: RemovedFamily = { kind, versions: [], tastings: [] };
  for (const note of tastings) {
    const done = await removeRecord('tastings', note.id);
    if (!done.ok) {
      await restoreFamily(removed);
      return done;
    }
    removed.tastings.push(note);
  }
  for (const version of versions) {
    const done = await removeRecord(kind, version.id);
    if (!done.ok) {
      await restoreFamily(removed);
      return done;
    }
    removed.versions.push(version);
  }
  // The day the dish was cooked goes with the dish, and comes back with it on Undo.
  const family = versions[0]?.version.family;
  if (kind === 'dishes' && family !== undefined) {
    const done = await removeCookedOf(family);
    if (!done.ok) {
      await restoreFamily(removed);
      return done;
    }
    if (done.removed !== undefined) removed.cooked = done.removed;
  }
  return { ok: true, removed };
};

/** Undo of `removeFamily`: puts the records back, versions first. */
export const restoreFamily = async (removed: RemovedFamily): Promise<Result> => {
  for (const version of removed.versions) {
    const done = await saveRecord(removed.kind, version as never);
    if (!done.ok) return done;
  }
  for (const note of removed.tastings) {
    const done = await saveRecord('tastings', note);
    if (!done.ok) return done;
  }
  if (removed.cooked !== undefined) return restoreCooked(removed.cooked);
  return { ok: true };
};

/** A new record in a new family, made from version `sourceId`; `name` is its visible name. */
export const makeVariation = async (
  kind: VersionKind,
  sourceId: string,
  name: string,
): Promise<Result<{ id: string }>> => {
  const source = versionRecord(kind, sourceId) as Versioned | undefined;
  if (source === undefined) return fail({ code: 'not-found' });
  const id = newId();
  const copy = structuredClone(source);
  const record = { ...copy, id, name, version: { family: id, parent: source.id, date: today() } };
  const done = await saveRecord(kind, record as never);
  return done.ok ? { ok: true, id } : done;
};

/**
 * Restores an old version as a new head: the content of version `versionId`, parent the
 * current head, `change` naming what was restored. History keeps every record.
 */
export const restoreVersion = async (
  kind: VersionKind,
  versionId: string,
  change: string,
): Promise<Result<{ id: string }>> => {
  const old = versionRecord(kind, versionId) as Versioned | undefined;
  const head = headOfFamily(kind, versionId) as Versioned | undefined;
  if (old === undefined || head === undefined || old.id === head.id) {
    return fail({ code: 'not-found' });
  }
  const id = newId();
  const record = {
    ...structuredClone(old),
    id,
    version: { family: old.version.family, parent: head.id, date: today(), change },
  };
  const done = await saveRecord(kind, record as never);
  return done.ok ? { ok: true, id } : done;
};
