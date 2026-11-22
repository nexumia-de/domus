// Pull the list down from its top to sync (docs/behaviour.md#sync): a touch
// gesture on the scrolling content, with a hint above it. Only a gesture for
// touch; Settings has "Sync now" for a mouse, a keyboard and a screen reader,
// so the hint is hidden from readers.
import { h } from './dom';

/** How far the hint must be pulled out before letting go syncs, in CSS px. */
export const PULL_THRESHOLD_PX = 64;
const MAX_PX = 88;

export interface PullOptions {
  /** Whether the gesture is offered now (the list is shown). */
  enabled: () => boolean;
  words: { pull: string; release: string; syncing: string };
  run: () => Promise<void>;
}

/** The hint's height for a finger moved `dy` px down: half the way, up to a maximum. */
export const pulledOut = (dy: number): number => Math.max(0, Math.min(MAX_PX, dy / 2));

/** Adds the gesture to `scroller`; returns the hint to put above it. */
export function pullToSync(scroller: HTMLElement, options: PullOptions): HTMLElement {
  const hint = h('div', { class: 'pull-hint', 'aria-hidden': 'true' });
  let startY: number | undefined;
  let shown = 0;
  let busy = false;

  const show = (px: number, text: string): void => {
    shown = px;
    hint.style.height = `${px}px`;
    hint.textContent = px > 0 ? text : '';
  };

  scroller.addEventListener(
    'touchstart',
    (event) => {
      if (busy || !options.enabled() || scroller.scrollTop > 0 || event.touches.length !== 1) {
        startY = undefined;
        return;
      }
      startY = event.touches[0]?.clientY;
    },
    { passive: true },
  );
  scroller.addEventListener(
    'touchmove',
    (event) => {
      const y = event.touches[0]?.clientY;
      if (startY === undefined || y === undefined) return;
      if (scroller.scrollTop > 0) {
        startY = undefined;
        show(0, '');
        return;
      }
      const px = pulledOut(y - startY);
      show(px, px >= PULL_THRESHOLD_PX ? options.words.release : options.words.pull);
    },
    { passive: true },
  );
  const end = (): void => {
    if (startY === undefined) return;
    startY = undefined;
    if (shown < PULL_THRESHOLD_PX) {
      show(0, '');
      return;
    }
    busy = true;
    show(PULL_THRESHOLD_PX / 2, options.words.syncing);
    void options.run().finally(() => {
      busy = false;
      show(0, '');
    });
  };
  scroller.addEventListener('touchend', end);
  scroller.addEventListener('touchcancel', () => {
    startY = undefined;
    show(0, '');
  });
  return hint;
}
