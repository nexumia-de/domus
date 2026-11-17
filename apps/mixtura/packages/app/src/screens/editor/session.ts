// The editor's working state while the screen is open: the draft, what the
// user has open (a menu, the picker, the ingredient form), and keeping the
// draft in the store. One session at a time, kept in memory when the user
// leaves the editor and rebuilt from the stored draft after a reload
// (docs/behaviour.md#state-and-reload).

import type { AppState } from '../../app-state';
import type { AppData } from '../../data';
import type { Route } from '../../router';
import type { Store } from '../../state';
import type { LocalStore } from '../../store';
import type { BrowseModel } from '../browse/model';
import { fingerprint, isDirty } from './draft';
import type { IngredientForm } from './ingredient-form';
import type { Draft, DraftLine } from './types';

export interface PickerState {
  lineKey: string;
  query: string;
  /** The category being browsed; null for the top level. */
  path: string | null;
  /** The search field takes focus when the sheet opens, once. */
  focus: boolean;
}

export interface FormState {
  /** The line the new ingredient goes to; null when none. */
  lineKey: string | null;
  form: IngredientForm;
  /** Errors are shown after Save was pressed or a field was left. */
  submitted: boolean;
  touched: ReadonlySet<string>;
  error: string | null;
}

export interface Session {
  key: string;
  status: 'loading' | 'ready';
  draft: Draft;
  /** The draft as saved: what Discard returns to. */
  base: Draft;
  baseline: string;
  restored: boolean;
  /** Before the first drawn frame of this session. */
  fresh: boolean;
  menu: string | null;
  notes: ReadonlySet<string>;
  /** Lines whose amount field was left once: their error may show. */
  touched: ReadonlySet<string>;
  picker: PickerState | null;
  form: FormState | null;
  /** The `data-focus` value to focus after the next draw. */
  focus: string | null;
  showErrors: boolean;
  saving: boolean;
  error: string | null;
  /** The error is a failed save, so Try Again makes sense. */
  errorRetry: boolean;
  /** Refreshes the parts of the drawn page that follow typing (set by the page on each draw). */
  live: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export interface Ctx {
  store: Store<AppState>;
  data: AppData;
  route: Route;
  session: Session;
  model: BrowseModel;
  units: 'metric' | 'us' | 'imperial';
  imperial: boolean;
  /** The local store is open: a save can be written. */
  writable: boolean;
}

const DRAFT_VERSION = 1;
let current: Session | null = null;

export const draftKeyOf = (key: string): string => `draft/${key}`;

export function bump(store: Store<AppState>): void {
  store.set({ editorRev: store.get().editorRev + 1 });
}

/** The draft as the store keeps it, or null when what was stored is not a draft. */
export function parseDraft(value: unknown): Draft | null {
  const v = value as { version?: number; draft?: Partial<Draft> } | null;
  const d = v?.draft;
  if (v?.version !== DRAFT_VERSION || !d || typeof d !== 'object') return null;
  const target = d.target as { kind?: string } | undefined;
  const lines = d.lines;
  const isLine = (l: unknown): boolean => {
    const line = l as Partial<DraftLine> | null;
    return (
      !!line &&
      typeof line.key === 'string' &&
      typeof line.ingredientId === 'string' &&
      typeof line.amountText === 'string' &&
      typeof line.unit === 'string' &&
      typeof line.note === 'string' &&
      typeof line.topText === 'string'
    );
  };
  const ok =
    ['new', 'edit', 'copy'].includes(target?.kind ?? '') &&
    typeof d.name === 'string' &&
    typeof d.templateId === 'string' &&
    Array.isArray(lines) &&
    lines.every(isLine) &&
    ['method', 'glass', 'garnish', 'notes'].every(
      (f) => typeof (d as Record<string, unknown>)[f] === 'string',
    ) &&
    ['draft', 'on-menu', 'retired'].includes(d.status ?? '') &&
    typeof d.prepared === 'object' &&
    d.prepared !== null &&
    typeof d.nextKey === 'number';
  return ok ? (d as Draft) : null;
}

/** The session of an address; a new one reads its stored draft first. */
export function sessionFor(
  key: string,
  base: () => Draft,
  local: LocalStore | null,
  onReady: () => void,
): Session {
  if (current?.key === key) return current;
  const draft = base();
  const session: Session = {
    key,
    status: local ? 'loading' : 'ready',
    draft,
    base: draft,
    baseline: fingerprint(draft),
    restored: false,
    fresh: true,
    menu: null,
    notes: new Set(),
    touched: new Set(),
    picker: null,
    form: null,
    focus: null,
    showErrors: false,
    saving: false,
    error: null,
    errorRetry: false,
    live: null,
    timer: undefined,
  };
  current = session;
  if (local) {
    const ready = (): void => {
      if (current !== session) return;
      session.status = 'ready';
      onReady();
    };
    local.drafts.get(draftKeyOf(key)).then((stored) => {
      const found = parseDraft(stored);
      if (found && current === session) {
        session.draft = found;
        session.restored = true;
      }
      ready();
    }, ready);
  }
  return session;
}

/** The user left the editor: a draft that comes back is announced as kept. */
export function markKept(): void {
  if (current && dirty(current)) current.restored = true;
}

/** Forgets the session (saved, or its drink was deleted). */
export function dropSession(session: Session): void {
  clearTimeout(session.timer);
  if (current === session) current = null;
}

export const dirty = (session: Session): boolean => isDirty(session.draft, session.baseline);

function writeNow(session: Session, local: LocalStore | null): void {
  clearTimeout(session.timer);
  if (!local) return;
  const key = draftKeyOf(session.key);
  const work = dirty(session)
    ? local.drafts.put(key, { version: DRAFT_VERSION, draft: session.draft })
    : local.drafts.delete(key);
  // A draft that cannot be kept must not break typing; the next change tries again.
  work.catch(() => undefined);
}

/** Keeps the draft in the store a moment after the last change. */
export function schedulePersist(session: Session, local: LocalStore | null): void {
  clearTimeout(session.timer);
  session.timer = setTimeout(() => writeNow(session, local), 300);
}

/** The user leaves the page or the app: write what is pending now. */
export function flushDraft(data: AppData): void {
  if (current?.status !== 'ready' || current.timer === undefined) return;
  writeNow(current, data.local());
}

/**
 * Something in the draft changed. `redraw` for a change of structure (a line,
 * a role, a sheet); typing only refreshes the live parts of the page.
 */
export function changed(ctx: Ctx, redraw: boolean): void {
  schedulePersist(ctx.session, ctx.data.local());
  if (redraw) {
    if (!ctx.session.saving) ctx.session.error = null;
    bump(ctx.store);
  } else ctx.session.live?.();
}
