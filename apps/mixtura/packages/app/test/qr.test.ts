// The QR module: a square matrix for a typical invite link, error correction
// M, and an image that is dark on white with a quiet zone.
import { expect, test } from 'vitest';
import { qrMatrix, qrSvg, QR_SIZE } from '../src/components/qr';

/** The few DOM calls qrSvg makes, recorded; the tests run without a DOM. */
class FakeElement {
  attrs = new Map<string, string>();
  children: FakeElement[] = [];
  constructor(readonly tag: string) {}
  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }
  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }
}
Object.assign(globalThis, {
  document: { createElementNS: (_ns: string, tag: string) => new FakeElement(tag) },
});

const LINK = `https://drinks.example/app/#/join/1.${'AbC-_9'.repeat(40)}`;

test('a typical link gives a square matrix', () => {
  const m = qrMatrix(LINK);
  expect(m.length).toBeGreaterThanOrEqual(21);
  expect(m.every((row) => row.length === m.length)).toBe(true);
  expect(m.some((row) => row.some(Boolean))).toBe(true);
  // the three finder patterns: dark corners
  expect(m[0]?.[0] && m[0]?.[m.length - 1] && m[m.length - 1]?.[0]).toBe(true);
});

test('the same text gives the same code; a longer one a bigger code', () => {
  expect(qrMatrix(LINK)).toEqual(qrMatrix(LINK));
  expect(qrMatrix(LINK + LINK).length).toBeGreaterThan(qrMatrix(LINK).length);
});

test('a text beyond the largest code throws', () => {
  expect(() => qrMatrix('x'.repeat(4000))).toThrow();
});

test('the image is labelled, fixed in size, dark on white with a quiet zone', () => {
  const svg = qrSvg(LINK, 'QR code of the invite link') as unknown as FakeElement;
  const get = (tag: string) => svg.children.find((c) => c.tag === tag);
  const n = qrMatrix(LINK).length;
  expect(svg.attrs.get('role')).toBe('img');
  expect(svg.attrs.get('aria-label')).toBe('QR code of the invite link');
  expect(svg.attrs.get('width')).toBe(String(QR_SIZE));
  expect(QR_SIZE).toBeLessThanOrEqual(240);
  expect(svg.attrs.get('viewBox')).toBe(`0 0 ${n + 8} ${n + 8}`);
  expect(get('rect')?.attrs.get('fill')).toBe('#fff');
  expect(get('path')?.attrs.get('fill')).toBe('#000');
  // the first dark module is drawn after the quiet zone of 4 modules
  expect(get('path')?.attrs.get('d')?.startsWith('M4 4h1v1h-1z')).toBe(true);
});
