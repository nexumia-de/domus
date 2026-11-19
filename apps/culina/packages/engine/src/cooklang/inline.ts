// The inline syntax of one step: ingredients `@`, cookware `#`, timers `~`, quantities,
// optional `?`, short preparations `( )` and references `@./path`. From the specification.
import type { CookQuantity, Segment } from './types';

const SINGLE = /^[\p{L}\p{N}_'’-]+/u;
// A name that ends at `{`: anything but markup and sentence punctuation, no space at either end.
const MULTI = /^[^\s@#~{}.,;:!?()\\][^@#~{}.,;:!?()\\\n]*$/u;
const PATH = /^\.\/[^\s@#~{}()\\,;:!?][^@#~{}()\\\n,;:!?]*$/;
const REFERENCE = /^\.\/[^\s{}@#~()]+/;

/** `1/2`, `0.5` and `500` are numbers; anything else stays text. */
const numberOf = (text: string): number | undefined => {
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (fraction) {
    const top = Number(fraction[1]);
    const bottom = Number(fraction[2]);
    return bottom === 0 ? undefined : top / bottom;
  }
  return undefined;
};

/** The inside of `{…}`: `qty%unit`, `qty` or nothing. */
export function parseQuantity(inner: string): CookQuantity | undefined {
  const percent = inner.indexOf('%');
  const left = (percent < 0 ? inner : inner.slice(0, percent)).trim();
  const unit = percent < 0 ? '' : inner.slice(percent + 1).trim();
  const locked = left.startsWith('=');
  const text = locked ? left.slice(1).trim() : left;
  if (text === '' && unit === '') return undefined;
  const value = numberOf(text);
  return {
    text,
    ...(value === undefined ? {} : { value }),
    ...(unit === '' ? {} : { unit }),
    locked,
  };
}

const closing = (s: string, from: number, close: string): number => s.indexOf(close, from);

interface Named {
  name: string;
  path?: string;
  optional: boolean;
  /** Where the text goes on after the name (and its braces). */
  end: number;
  inner?: string;
}

/** Reads what follows `@` or `#` at `at` (the sigil's index): optional mark, name, braces. */
function readNamed(s: string, at: number, allowReference: boolean): Named | undefined {
  let j = at + 1;
  let optional = false;
  if (s[j] === '?') {
    optional = true;
    j++;
  }
  if (j >= s.length || /\s/.test(s[j] ?? '')) return undefined;
  let name: string;
  let path: string | undefined;
  if (allowReference && s.startsWith('./', j)) {
    // A path may hold spaces when braces follow, like a multi-word name.
    const open = s.indexOf('{', j);
    const candidate = open < 0 ? '' : s.slice(j, open);
    let text: string;
    if (open >= 0 && PATH.test(candidate) && /\S$/.test(candidate) && closing(s, open, '}') > 0) {
      text = candidate;
    } else {
      const bare = REFERENCE.exec(s.slice(j));
      if (!bare) return undefined;
      text = bare[0];
    }
    path = text.slice(2);
    name = path.split('/').pop() ?? path;
    j += text.length;
  } else {
    const open = s.indexOf('{', j);
    const candidate = open < 0 ? '' : s.slice(j, open);
    if (open >= 0 && MULTI.test(candidate) && /\S$/.test(candidate) && closing(s, open, '}') > 0) {
      name = candidate;
      j = open;
    } else {
      const single = SINGLE.exec(s.slice(j));
      if (!single) return undefined;
      name = single[0];
      j += name.length;
    }
  }
  const named: Named = { name, ...(path === undefined ? {} : { path }), optional, end: j };
  if (s[j] === '{') {
    const close = closing(s, j, '}');
    if (close > 0) {
      named.inner = s.slice(j + 1, close);
      named.end = close + 1;
    }
  }
  return named;
}

/** Splits one step's text into text, ingredients, cookware and timers. */
export function parseInline(s: string): Segment[] {
  const out: Segment[] = [];
  let text = '';
  const flush = (): void => {
    if (text !== '') out.push({ type: 'text', text });
    text = '';
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (c === '@' || c === '#') {
      const named = readNamed(s, i, c === '@');
      if (named) {
        flush();
        let end = named.end;
        if (c === '#') {
          out.push({ type: 'cookware', name: named.name, optional: named.optional });
        } else {
          const quantity = named.inner === undefined ? undefined : parseQuantity(named.inner);
          let note: string | undefined;
          if (s[end] === '(' && closing(s, end, ')') > 0) {
            const close = closing(s, end, ')');
            note = s.slice(end + 1, close).trim();
            end = close + 1;
          }
          out.push({
            type: 'ingredient',
            name: named.name,
            ...(named.path === undefined ? {} : { path: named.path }),
            ...(quantity === undefined ? {} : { quantity }),
            ...(note === undefined || note === '' ? {} : { note }),
            optional: named.optional,
            reference: named.path !== undefined,
          });
        }
        i = end;
        continue;
      }
    }
    if (c === '~') {
      const open = s.indexOf('{', i + 1);
      const close = open < 0 ? -1 : closing(s, open, '}');
      const name = open < 0 ? '' : s.slice(i + 1, open);
      if (close > 0 && /^[\p{L}\p{N}_' -]*$/u.test(name)) {
        flush();
        const quantity = parseQuantity(s.slice(open + 1, close));
        out.push({
          type: 'timer',
          ...(name.trim() === '' ? {} : { name: name.trim() }),
          ...(quantity === undefined ? {} : { quantity }),
        });
        i = close + 1;
        continue;
      }
    }
    text += c;
    i++;
  }
  flush();
  return out;
}

/** A step as plain text: names in place of markup, a timer as its time. */
export const plainText = (segments: readonly Segment[]): string =>
  segments
    .map((seg) => {
      if (seg.type === 'text') return seg.text;
      if (seg.type === 'ingredient' || seg.type === 'cookware') return seg.name;
      const q = seg.quantity;
      return q === undefined ? '' : [q.text, q.unit].filter(Boolean).join(' ');
    })
    .join('')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
