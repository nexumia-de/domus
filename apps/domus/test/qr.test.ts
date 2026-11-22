import { expect, test } from 'vitest';
import { qrModules, qrPath } from '../src/qr';

test('a QR code is a square of modules with the three finder patterns', () => {
  const modules = qrModules('https://domus.nexumia.de/#/join/abc');
  const side = modules.length;
  expect(side).toBeGreaterThanOrEqual(21);
  expect(modules.every((row) => row.length === side)).toBe(true);
  // The top-left finder pattern: a dark ring, a light ring, a dark centre.
  expect(modules[0]?.slice(0, 7).every(Boolean)).toBe(true);
  expect(modules[3]?.[3]).toBe(true);
  expect(modules[1]?.[1]).toBe(false);
  for (const [row, column] of [
    [0, side - 1],
    [side - 1, 0],
  ] as const) {
    expect(modules[row]?.[column]).toBe(true);
  }
});

test('the path draws exactly the dark modules, inside a quiet zone of four', () => {
  const modules = [
    [true, true, false],
    [false, true, false],
  ];
  expect(qrPath(modules)).toBe('M4 4h2v1h-2zM5 5h1v1h-1z');
});

test('a text that is too long is an error, not a wrong code', () => {
  expect(() => qrModules('x'.repeat(5000))).toThrow();
});
