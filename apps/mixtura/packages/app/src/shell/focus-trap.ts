/**
 * Tab and Shift+Tab stay inside an open modal dialog (WAI-ARIA Authoring
 * Practices, modal dialog): from the last control Tab goes to the first, from
 * the first Shift+Tab goes to the last, and from the dialog itself (where
 * the sheets put focus when they open) to either end. `inertBehindModal`
 * already keeps the page behind out of reach; this keeps focus from leaving
 * the page for the browser's own controls. Called after every redraw, which
 * builds the dialog from scratch, so nothing has to be removed.
 */

const FOCUSABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

function tabbable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !(el as HTMLButtonElement).disabled &&
      el.tabIndex >= 0 &&
      el.getClientRects().length > 0 &&
      el.closest('[inert], [hidden]') === null,
  );
}

export function trapFocus(app: HTMLElement): void {
  const dialog = app.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
  if (!dialog) return;
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    const items = tabbable(dialog);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const active = document.activeElement;
    const outside = active === dialog || !dialog.contains(active);
    if (event.shiftKey && (outside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (outside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  });
}
