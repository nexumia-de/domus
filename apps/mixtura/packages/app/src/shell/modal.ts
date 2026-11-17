/**
 * A modal sheet (`role="dialog"` with `aria-modal`) takes the keyboard
 * and the screen reader with it: everything outside it, apart from the
 * toast (its Undo stays reachable), is made `inert`, so Tab cannot reach
 * what is behind the sheet. Called after every redraw, which builds the
 * page from scratch, so nothing has to be undone.
 */
export function inertBehindModal(app: HTMLElement): void {
  const dialog = app.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
  if (!dialog) return;
  for (let node: HTMLElement = dialog; node !== app;) {
    const parent = node.parentElement;
    if (!parent) return;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && !sibling.classList.contains('toast')) {
        sibling.setAttribute('inert', '');
      }
    }
    node = parent;
  }
}
