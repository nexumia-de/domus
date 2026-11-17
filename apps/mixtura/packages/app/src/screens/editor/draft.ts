// The draft and what the user does to it: pure functions from a draft to a
// new draft. Nothing here reads the store or the screen; the session
// (session.ts) calls these and keeps the result.

import type { Role, SpecData, SpecLine, Template } from '../browse/types';
import { storedText } from './amount-entry';
import type { Draft, DraftLine, DraftPrepared, Target } from './types';

export const noPrepared: DraftPrepared = {
  on: false,
  yieldText: '',
  shelfText: '',
  parentId: '',
  role: '',
  ingredientId: '',
};

export function blankDraft(target: Target = { kind: 'new' }): Draft {
  return {
    target,
    name: '',
    templateId: '',
    lines: [],
    method: '',
    glass: '',
    garnish: '',
    notes: '',
    status: 'draft',
    prepared: noPrepared,
    keep: {},
    nextKey: 1,
  };
}

function lineOf(key: string, line: SpecLine): DraftLine {
  const text = storedText(line);
  return {
    key,
    ingredientId: line.ingredientId,
    amountText: text,
    unit: line.unit,
    ...(line.role && { role: line.role }),
    optional: line.optional === true,
    note: line.note ?? '',
    topText: line.topMl !== undefined ? String(line.topMl) : '',
    original: line,
    originalText: text,
  };
}

/**
 * The draft of a stored drink. A built-in drink starts a copy of the user's
 * own that names it as its parent; the user's own drink is edited in place.
 */
export function draftFromSpec(
  spec: SpecData,
  origin: 'seed' | 'user',
  prepared:
    | {
        ingredientId: string;
        yieldText: string;
        shelfText: string;
        parentId: string;
        role: '' | Role;
      }
    | undefined,
): Draft {
  const target: Target =
    origin === 'seed'
      ? { kind: 'copy', fromId: spec.id, fromName: spec.name }
      : { kind: 'edit', id: spec.id, lineageId: spec.lineageId, version: spec.version };
  const keep: Draft['keep'] = {
    ...(spec.tags && { tags: spec.tags }),
    ...(spec.source && { source: spec.source }),
    ...(origin === 'user' && spec.parentId !== undefined && { parentId: spec.parentId }),
    ...(origin === 'user' && spec.createdAt !== undefined && { createdAt: spec.createdAt }),
  };
  return {
    target,
    name: spec.name,
    templateId: spec.templateId ?? '',
    lines: spec.lines.map((line, i) => lineOf(`k${i + 1}`, line)),
    method: spec.method ?? '',
    glass: spec.glass ?? '',
    garnish: spec.garnish ?? '',
    notes: spec.notes ?? '',
    status: origin === 'seed' ? 'draft' : spec.status,
    prepared: prepared ? { on: true, ...prepared } : noPrepared,
    keep,
    nextKey: spec.lines.length + 1,
  };
}

/**
 * The draft of a riff on `spec` (any drink, built-in or the user's own): a new
 * drink with its lines, named "<name> riff", a draft, that names `spec` as
 * its parent. `lines` replaces the lines when the riff starts from a swap.
 */
export function riffDraft(
  spec: SpecData,
  lines: readonly SpecLine[] = spec.lines,
  suffix = 'riff',
): Draft {
  const keep: Draft['keep'] = {
    ...(spec.tags && { tags: spec.tags }),
    ...(spec.source && { source: spec.source }),
  };
  return {
    target: { kind: 'copy', fromId: spec.id, fromName: spec.name, riff: true },
    name: `${spec.name} ${suffix}`,
    templateId: spec.templateId ?? '',
    lines: lines.map((line, i) => lineOf(`k${i + 1}`, line)),
    method: spec.method ?? '',
    glass: spec.glass ?? '',
    garnish: spec.garnish ?? '',
    notes: spec.notes ?? '',
    status: 'draft',
    prepared: noPrepared,
    keep,
    nextKey: lines.length + 1,
  };
}

/** What identifies the draft's content; line keys and counters do not count. */
export function fingerprint(draft: Draft): string {
  return JSON.stringify({
    ...draft,
    nextKey: 0,
    lines: draft.lines.map((line) => ({
      ...line,
      key: '',
      original: undefined,
      originalText: undefined,
    })),
  });
}

export const isDirty = (draft: Draft, baseline: string): boolean => fingerprint(draft) !== baseline;

export function emptyLine(draft: Draft, role?: Role): { draft: Draft; key: string } {
  const key = `k${draft.nextKey}`;
  const line: DraftLine = {
    key,
    ingredientId: '',
    amountText: '',
    unit: '',
    ...(role && { role }),
    optional: false,
    note: '',
    topText: '',
  };
  return { draft: { ...draft, lines: [...draft.lines, line], nextKey: draft.nextKey + 1 }, key };
}

export function updateLine(
  draft: Draft,
  key: string,
  change: (line: DraftLine) => DraftLine,
): Draft {
  return { ...draft, lines: draft.lines.map((l) => (l.key === key ? change(l) : l)) };
}

export function removeLine(
  draft: Draft,
  key: string,
): { draft: Draft; at: number; line?: DraftLine } {
  const at = draft.lines.findIndex((l) => l.key === key);
  if (at < 0) return { draft, at };
  return {
    draft: { ...draft, lines: draft.lines.filter((l) => l.key !== key) },
    at,
    line: draft.lines[at] as DraftLine,
  };
}

export function insertLine(draft: Draft, line: DraftLine, at: number): Draft {
  const lines = [...draft.lines];
  lines.splice(Math.min(at, lines.length), 0, line);
  return { ...draft, lines };
}

/** Moves a line to a position; out-of-range targets are clamped. */
export function moveLine(draft: Draft, key: string, to: number): Draft {
  const from = draft.lines.findIndex((l) => l.key === key);
  if (from < 0) return draft;
  const target = Math.max(0, Math.min(draft.lines.length - 1, to));
  if (target === from) return draft;
  const lines = [...draft.lines];
  const [moved] = lines.splice(from, 1);
  lines.splice(target, 0, moved as DraftLine);
  return { ...draft, lines };
}

/**
 * Choosing a template adds its slots as empty lines with their role, for the
 * roles no line has yet; typed lines are never changed or removed.
 */
export function withTemplate(
  draft: Draft,
  template: Template | undefined,
  roleOf: (line: DraftLine) => Role | undefined,
): Draft {
  const next: Draft = { ...draft, templateId: template?.id ?? '' };
  if (!template) return next;
  let result = next;
  const covered = new Set(
    result.lines.map((l) => roleOf(l)).filter((r): r is Role => r !== undefined),
  );
  for (const slot of template.slots) {
    if (covered.has(slot.role)) continue;
    covered.add(slot.role);
    result = emptyLine(result, slot.role).draft;
  }
  return result;
}
