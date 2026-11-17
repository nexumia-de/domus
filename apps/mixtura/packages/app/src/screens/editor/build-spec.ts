// A checked draft as the records the store writes: the spec and, for a
// prepared ingredient, its ingredient record. Fields the editor has no
// control for travel with the draft unchanged.

import type { Ingredient, Spec } from '../../store';
import type { DraftCheck } from './check';
import type { Draft } from './types';

export interface Ids {
  specId: string;
  lineageId: string;
  version: number;
}

/** The ids a draft saves under: its own for an edit, new ones for a new drink or a copy. */
export function idsFor(draft: Draft, newId: () => string): Ids {
  const t = draft.target;
  if (t.kind === 'edit') return { specId: t.id, lineageId: t.lineageId, version: t.version };
  const id = newId();
  return { specId: id, lineageId: id, version: 1 };
}

export function draftToSpec(draft: Draft, check: DraftCheck, ids: Ids, now: string): Spec {
  const parentId = draft.target.kind === 'copy' ? draft.target.fromId : draft.keep.parentId;
  const spec: Spec = {
    id: ids.specId,
    lineageId: ids.lineageId,
    version: ids.version,
    ...(parentId !== undefined && { parentId }),
    name: draft.name.trim(),
    ...(draft.templateId !== '' && { templateId: draft.templateId }),
    lines: check.spec.lines,
    ...(draft.method !== '' && { method: draft.method }),
    ...(draft.glass !== '' && { glass: draft.glass }),
    ...(draft.garnish.trim() !== '' && { garnish: draft.garnish.trim() }),
    ...(draft.notes.trim() !== '' && { notes: draft.notes.trim() }),
    ...(draft.keep.tags && { tags: draft.keep.tags }),
    status: draft.status,
    ...(draft.keep.source && { source: draft.keep.source }),
    createdAt: draft.keep.createdAt ?? now,
    updatedAt: now,
  };
  return spec;
}

/** The ingredient record of a prepared draft; `existing` keeps what the user set elsewhere. */
export function draftToIngredient(
  draft: Draft,
  check: DraftCheck,
  specId: string,
  id: string,
  existing: Ingredient | undefined,
): Ingredient {
  const p = draft.prepared;
  const found = check.prepared;
  const base = existing ? { ...existing } : ({} as Partial<Ingredient>);
  delete base.parentId;
  delete base.role;
  delete base.shelfLifeDays;
  delete base.storage;
  return {
    ...base,
    id,
    name: draft.name.trim(),
    level: p.parentId !== '' ? 'product' : 'category',
    ...(p.parentId !== '' && { parentId: p.parentId }),
    ...(p.role !== '' && { role: p.role }),
    ...(found?.shelfDays !== undefined && { shelfLifeDays: found.shelfDays }),
    ...(found?.storage !== undefined && { storage: found.storage }),
    prepared: {
      specId,
      yield: { amount: found?.yield?.amount ?? 0, unit: found?.yield?.unit ?? 'ml' },
    },
  } as Ingredient;
}
