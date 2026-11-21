// How a source's title and place are shown. The files keep them as written down when the source was
// transcribed (English bibliographic words, and for some dishes the lines of the text file the
// transcriber worked from); the screen shows a reader's citation: the transcriber's line numbers are
// left out, and in German the usual abbreviations stand for chapter, section, edition and page.
import type { Lang } from '@culina/engine';

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

/** The transcriber's own references: "gouffe.txt lines 14702-14761", "lines 30656–30712". */
const transcriptRefs = (text: string): string =>
  text
    // "; gouffe.txt lines 1-2" and "; lines 1–2" as a clause of their own.
    .replace(/[;,]\s*(?:[\w-]+\.txt\s+)?lines\s+\d+\s*[-–]\s*\d+/g, '')
    // A remark about the scan ("running head garbled in the OCR").
    .replace(/\s*\([^)]*\bOCR\b[^)]*\)/g, '')
    // What is left of a clause that only referred to such lines ("..., lines 1-2" removed above).
    .replace(/\s{2,}/g, ' ')
    .trim();

const GERMAN: readonly (readonly [RegExp, string | ((...m: string[]) => string)])[] = [
  [/\b(\d+)(?:st|nd|rd|th) edition\b/g, (_, n = '') => `${n}. Aufl.`],
  [
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) edition\b/gi,
    (_, word = '') => `${ORDINALS[word.toLowerCase()] ?? word}. Aufl.`,
  ],
  [/\bprinted (pp?\.)/g, '$1'],
  [/\bpp\.\s*/g, 'S. '],
  [/\bp\.\s*/g, 'S. '],
  [/\bpages\s+/g, 'S. '],
  [/\bpage\s+/g, 'S. '],
  [/\bchapter\s+/g, 'Kap. '],
  [/\bsection\s+/g, 'Abschn. '],
  [/\brecipe\s+/g, 'Rezept '],
  [/\bNo\.\s*/g, 'Nr. '],
  [/\bDivision\s+/g, 'Abt. '],
  [/\(box\)/g, '(Kasten)'],
  [/\be-book\b/g, 'E-Book'],
  // German quotation marks around a quoted title.
  [/"([^"]+)"/g, '\u201e$1\u201c'],
];

/**
 * A source's title or place for the screen.
 *
 * @param text - The title or place as the file has it.
 * @param lang - The language of the screen.
 */
export const citeText = (text: string, lang: Lang): string => {
  const plain = transcriptRefs(text);
  if (lang !== 'de') return plain;
  return GERMAN.reduce<string>(
    (out, [pattern, to]) =>
      typeof to === 'string' ? out.replace(pattern, to) : out.replace(pattern, to),
    plain,
  );
};
