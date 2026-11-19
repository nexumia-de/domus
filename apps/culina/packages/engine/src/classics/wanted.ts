// The lines of a classic that still name a `wanted` ingredient instead of a catalogue one.
import type { I18nText } from '../text/i18n';
import type { Classic } from './types';

/** A line or slot without a catalogue ingredient. */
export interface WantedLine {
  /** Where it is: `components[0].lines[2]` or `slots[1]`. */
  path: string;
  wanted: I18nText;
}

/**
 * Lists every `wanted` line and slot of a classic. A later package replaces them with catalogue
 * ingredients until none is left.
 *
 * @param classic - A classic.
 * @returns The wanted lines in file order; empty when every line has a catalogue ingredient.
 */
export function wantedLines(classic: Classic): WantedLine[] {
  const out: WantedLine[] = [];
  (classic.components ?? []).forEach((c, i) =>
    c.lines.forEach((line, j) => {
      if (line.wanted !== undefined)
        out.push({ path: `components[${i}].lines[${j}]`, wanted: line.wanted });
    }),
  );
  classic.slots.forEach((slot, i) => {
    if (slot.wanted !== undefined) out.push({ path: `slots[${i}]`, wanted: slot.wanted });
  });
  return out;
}
