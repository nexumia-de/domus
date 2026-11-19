// WCAG 2.2 SC 2.4.11 Focus Not Obscured (docs/design.md, Text size and reflow):
// the action bar sits under the scroll area and changes height while the user
// types (the reason line under Save appears and goes), which shrinks the scroll
// area under the focused field. When the area changes size the focused element
// inside it is scrolled back into view.

/** Keeps the focused element of `scroll` visible whenever `scroll` is resized. */
export function keepFocusVisible(scroll: HTMLElement): void {
  if (typeof ResizeObserver === 'undefined') return;
  let height = -1;
  new ResizeObserver(() => {
    const now = scroll.clientHeight;
    const shrunk = height >= 0 && now < height;
    height = now;
    const focused = document.activeElement;
    if (shrunk && focused instanceof HTMLElement && scroll.contains(focused)) {
      focused.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }).observe(scroll);
}
