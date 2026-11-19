// Autosave of an editor's draft: a short pause after the last change, and at once when the
// screen is left (route change, page hidden). A closed
// session (saved, discarded, deleted) never writes again.
import { dropDraft, keepDraft } from '../../notebook';

export interface DraftSession {
  /** The form changed: keep the draft soon. */
  change(): void;
  /** Ends the session and removes the draft (after a save, a discard or a delete). */
  close(): Promise<void>;
}

const PAUSE_MS = 300;
/** Sessions that may still hold an unsaved change. The router has already drawn the next screen. */
const open = new Set<() => void>();

const leave = (): void => {
  for (const flush of open) flush();
};
let wired = false;
const wire = (): void => {
  if (wired) return;
  wired = true;
  window.addEventListener('hashchange', leave);
  window.addEventListener('pagehide', leave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
  });
};

export const draftSession = (key: string, read: () => unknown): DraftSession => {
  wire();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let closed = false;
  const flush = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (closed || !dirty) return;
    dirty = false;
    void keepDraft(key, read());
  };
  const session: DraftSession = {
    change() {
      if (closed) return;
      dirty = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, PAUSE_MS);
    },
    async close() {
      closed = true;
      open.delete(flush);
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      await dropDraft(key);
    },
  };
  open.add(flush);
  return session;
};
