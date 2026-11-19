import { expect, test } from 'vitest';
import { shouldRegister } from '../src/sw-register';

test('the service worker registers over http(s) only', () => {
  expect(shouldRegister({ protocol: 'https:', search: '' }, true)).toBe(true);
  expect(shouldRegister({ protocol: 'http:', search: '' }, true)).toBe(true);
  expect(shouldRegister({ protocol: 'file:', search: '' }, true)).toBe(false);
  expect(shouldRegister({ protocol: 'capacitor:', search: '' }, true)).toBe(false);
});

test('?no-sw and a browser without service workers skip it', () => {
  expect(shouldRegister({ protocol: 'https:', search: '?no-sw' }, true)).toBe(false);
  expect(shouldRegister({ protocol: 'https:', search: '?a=1&no-sw' }, true)).toBe(false);
  expect(shouldRegister({ protocol: 'https:', search: '' }, false)).toBe(false);
});
