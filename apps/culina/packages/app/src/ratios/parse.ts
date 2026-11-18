// Number entry: 500, 500.5 and 500,5 (comma as decimal mark), trimmed. Anything else is not a number.

export type Entry = { kind: 'empty' } | { kind: 'invalid' } | { kind: 'ok'; value: number };

const NUMBER = /^\d+(?:[.,]\d+)?$/;

/** Reads a typed number: empty text is `empty`; text that is not a number above 0 is `invalid`. */
export const parseEntry = (text: string): Entry => {
  const trimmed = text.trim();
  if (trimmed === '') return { kind: 'empty' };
  if (!NUMBER.test(trimmed)) return { kind: 'invalid' };
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? { kind: 'ok', value } : { kind: 'invalid' };
};
