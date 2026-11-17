// What the fields, the lines and the line menu do. Each action changes the
// session's draft and says whether the page must be drawn again (a change of
// structure) or only its live parts refreshed (typing). Sheets are in
// sheet-actions.ts, saving in commit.ts.

import { lineRole, type Role } from '@mixtura/engine';
import { showToast } from '../../toasts';
import { checkLine } from './check';
import { emptyLine, insertLine, moveLine, removeLine, updateLine, withTemplate } from './draft';
import { withUnit } from './amount-entry';
import { editorStrings as t } from './strings';
import { changed, type Ctx } from './session';
import type { Draft, DraftLine, DraftPrepared } from './types';

type TextField = 'name' | 'garnish' | 'notes' | 'method' | 'glass' | 'status';

export function setField(ctx: Ctx, field: TextField, value: string): void {
  ctx.session.draft = { ...ctx.session.draft, [field]: value } as Draft;
  changed(ctx, false);
}

/** The role a line has now: the user's or the ingredient's own. */
function roleOf(ctx: Ctx, line: DraftLine): Role | undefined {
  if (line.role) return line.role;
  if (line.ingredientId === '') return undefined;
  const own = lineRole(ctx.model.tree, { ingredientId: line.ingredientId, amount: 1, unit: 'ml' });
  return 'role' in own ? own.role : undefined;
}

/** Another template, or none. Its slots become empty lines for the roles no line has yet. */
export function setTemplate(ctx: Ctx, id: string): void {
  const template = ctx.model.templateById.get(id);
  let draft = withTemplate(ctx.session.draft, template, (line) => roleOf(ctx, line));
  if (template) {
    if (draft.method === '') draft = { ...draft, method: template.method };
    if (draft.glass === '' && template.glass) draft = { ...draft, glass: template.glass };
  }
  ctx.session.draft = draft;
  changed(ctx, true);
}

function change(
  ctx: Ctx,
  key: string,
  edit: (line: DraftLine) => DraftLine,
  redraw: boolean,
): void {
  ctx.session.draft = updateLine(ctx.session.draft, key, edit);
  changed(ctx, redraw);
}

/** Typing in the amount field; a unit in the text moves the selector. */
export function setAmount(ctx: Ctx, key: string, text: string): void {
  change(
    ctx,
    key,
    (line) => {
      const typed = { ...line, amountText: text };
      const read = checkLine(ctx.model, typed, ctx.imperial);
      return read.status === 'ok' && read.unit && line.unit !== 'top'
        ? { ...typed, unit: read.unit }
        : typed;
    },
    false,
  );
}

/** The unit selector: the number stays, the unit changes; `top` has no amount. */
export function setUnit(ctx: Ctx, key: string, unit: string): void {
  change(
    ctx,
    key,
    (line) => ({
      ...line,
      unit,
      amountText: unit === 'top' || line.unit === 'top' ? '' : withUnit(line.amountText, unit),
    }),
    true,
  );
  ctx.session.focus = `unit-${key}`;
}

export function setTop(ctx: Ctx, key: string, text: string): void {
  change(ctx, key, (line) => ({ ...line, topText: text }), false);
}

export function setNote(ctx: Ctx, key: string, text: string): void {
  change(ctx, key, (line) => ({ ...line, note: text }), false);
}

export function openNote(ctx: Ctx, key: string): void {
  ctx.session.notes = new Set([...ctx.session.notes, key]);
  ctx.session.focus = `note-${key}`;
  ctx.session.menu = null;
  changed(ctx, true);
}

export function setRole(ctx: Ctx, key: string, role: '' | Role): void {
  change(
    ctx,
    key,
    (line) => {
      const next: DraftLine = { ...line };
      if (role === '') delete next.role;
      else next.role = role;
      return next;
    },
    true,
  );
  ctx.session.focus = `role-${key}`;
}

export function toggleOptional(ctx: Ctx, key: string): void {
  change(ctx, key, (line) => ({ ...line, optional: !line.optional }), true);
  ctx.session.focus = `optional-${key}`;
}

export function toggleMenu(ctx: Ctx, key: string): void {
  ctx.session.menu = ctx.session.menu === key ? null : key;
  ctx.session.focus = `menu-${key}`;
  changed(ctx, true);
}

/** Moves a line to a position (drag, arrow keys) or by one (the menu). */
export function move(ctx: Ctx, key: string, to: number): void {
  const before = ctx.session.draft;
  ctx.session.draft = moveLine(before, key, to);
  if (ctx.session.draft === before) return;
  ctx.session.focus = `reorder-${key}`;
  changed(ctx, true);
}

export function moveBy(ctx: Ctx, key: string, delta: -1 | 1): void {
  const at = ctx.session.draft.lines.findIndex((l) => l.key === key);
  move(ctx, key, at + delta);
}

/** Removes a line at once; the toast offers Undo. */
export function remove(ctx: Ctx, key: string): void {
  const { draft, at, line } = removeLine(ctx.session.draft, key);
  if (!line) return;
  ctx.session.draft = draft;
  ctx.session.menu = null;
  changed(ctx, true);
  const name = ctx.model.ingredientName(line.ingredientId) ?? t.emptySlot;
  showToast(ctx.store, t.removed(name), () => {
    ctx.session.draft = insertLine(ctx.session.draft, line, at);
    changed(ctx, true);
  });
}

/** Adds an empty line; the caller opens the ingredient picker for it. */
export function addEmptyLine(ctx: Ctx): string {
  const added = emptyLine(ctx.session.draft);
  ctx.session.draft = added.draft;
  changed(ctx, false);
  return added.key;
}

export function setPrepared(ctx: Ctx, patch: Partial<DraftPrepared>, redraw = false): void {
  ctx.session.draft = {
    ...ctx.session.draft,
    prepared: { ...ctx.session.draft.prepared, ...patch },
  };
  changed(ctx, redraw);
}
