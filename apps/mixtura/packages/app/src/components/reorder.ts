// Drag to reorder: a handle on each line card (touch and mouse), and the
// arrow keys on the same handle for the keyboard. While dragging, the card
// follows the pointer; the new place is decided when it is let go.

export interface ReorderActions {
  /** The card was dropped at this position. */
  drop(to: number): void;
  /** One step by the arrow keys. */
  step(delta: -1 | 1): void;
}

export function enableReorder(
  handle: HTMLElement,
  card: HTMLElement,
  actions: ReorderActions,
): void {
  let start: { y: number; from: number; centers: number[]; own: number } | null = null;
  const finish = (): void => {
    card.classList.remove('is-dragging');
    card.style.transform = '';
    start = null;
  };
  const targetOf = (dy: number): number => {
    if (!start) return 0;
    const centre = (start.centers[start.from] as number) + dy;
    let to = 0;
    start.centers.forEach((c, i) => {
      if (i !== start?.from && c < centre) to += 1;
    });
    return to;
  };
  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const cards = [...(card.parentElement?.querySelectorAll(':scope > [data-line-card]') ?? [])];
    const from = cards.indexOf(card);
    if (from < 0) return;
    handle.setPointerCapture(event.pointerId);
    start = {
      y: event.clientY,
      from,
      own: card.getBoundingClientRect().height,
      centers: cards.map((c) => {
        const r = c.getBoundingClientRect();
        return r.top + r.height / 2;
      }),
    };
    card.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (event) => {
    if (!start) return;
    card.style.transform = `translateY(${event.clientY - start.y}px)`;
  });
  handle.addEventListener('pointerup', (event) => {
    if (!start) return;
    const { from } = start;
    const to = targetOf(event.clientY - start.y);
    finish();
    if (to !== from) actions.drop(to);
  });
  handle.addEventListener('pointercancel', finish);
  handle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    actions.step(event.key === 'ArrowUp' ? -1 : 1);
  });
}
