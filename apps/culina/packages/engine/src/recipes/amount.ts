// Reads an amount as a cook writes it ("200 g", "1/2 TL", "1½ EL", "3", "1,5 kg") into the same
// quantity a Cooklang file gives, so one reader decides what is known (`givenAmount`). A text
// that is not a number first ("etwas", "to taste"), a range ("2-3 EL") or a number that could be
// a thousand or a decimal ("1.000 g") keeps its text and gets no value: the import leaves it open.
import type { CookQuantity } from '../cooklang/types';

const VULGAR: Record<string, number> = {
  '½': 1 / 2,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 1 / 8,
};
const VULGAR_CLASS = '[½¼¾⅓⅔⅛]';

interface Leading {
  value?: number;
  /** The number as written. */
  text: string;
  rest: string;
}

const decimal = (whole: string, part: string | undefined): number | undefined => {
  if (part === undefined) return Number(whole);
  // "1.000" or "1,250": a thousand or a decimal; only a leading 0 makes it plain.
  if (part.length === 3 && whole !== '0') return undefined;
  return Number(`${whole}.${part}`);
};

function leadingNumber(s: string): Leading | undefined {
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)/.exec(s);
  if (mixed) {
    const bottom = Number(mixed[3]);
    return {
      text: mixed[0],
      ...(bottom === 0 ? {} : { value: Number(mixed[1]) + Number(mixed[2]) / bottom }),
      rest: s.slice(mixed[0].length),
    };
  }
  const fraction = /^(\d+)\s*\/\s*(\d+)/.exec(s);
  if (fraction) {
    const bottom = Number(fraction[2]);
    return {
      text: fraction[0],
      ...(bottom === 0 ? {} : { value: Number(fraction[1]) / bottom }),
      rest: s.slice(fraction[0].length),
    };
  }
  const vulgar = new RegExp(`^(\\d+)?\\s*(${VULGAR_CLASS})`).exec(s);
  if (vulgar) {
    return {
      text: vulgar[0],
      value: Number(vulgar[1] ?? 0) + (VULGAR[vulgar[2] ?? ''] ?? 0),
      rest: s.slice(vulgar[0].length),
    };
  }
  const plain = /^(\d+)(?:[.,](\d+))?/.exec(s);
  if (plain) {
    const value = decimal(plain[1] ?? '', plain[2]);
    return {
      text: plain[0],
      ...(value === undefined ? {} : { value }),
      rest: s.slice(plain[0].length),
    };
  }
  return undefined;
}

/**
 * @param written - The amount as the recipe writes it, number first, then the unit word.
 * @returns The quantity: `value` only for one plain number, `unit` for the word after it.
 */
export function readWrittenAmount(written: string): CookQuantity | undefined {
  const s = written.trim().replace(/\s+/g, ' ');
  if (s === '') return undefined;
  const lead = leadingNumber(s);
  if (lead === undefined) return { text: s, locked: false };
  // A range ("2-3 EL", "2 bis 3 EL") is not one amount.
  if (/^\s*(-|–|bis\b|to\b)\s*\d/.test(lead.rest)) return { text: s, locked: false };
  const unit = lead.rest.trim();
  return {
    text: lead.text.trim(),
    ...(lead.value === undefined || !(lead.value > 0) ? {} : { value: lead.value }),
    ...(unit === '' ? {} : { unit }),
    locked: false,
  };
}
