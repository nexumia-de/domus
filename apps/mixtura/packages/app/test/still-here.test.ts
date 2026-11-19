import { describe, expect, test } from 'vitest';
import { parseHash } from '../src/router';
import type { ScreenContext } from '../src/screen';
import { whileHere } from '../src/screens/still-here';

const contextAt = (drawn: string, now: () => string): ScreenContext =>
  ({
    route: parseHash(drawn),
    store: { get: () => ({ route: parseHash(now()) }) },
  }) as unknown as ScreenContext;

describe('a change that lands after the user has moved on', () => {
  test('is made against the address as it is now while the screen is the same', () => {
    let hash = '#/drinks?sort=template';
    const seen: string[] = [];
    const ctx = contextAt('#/drinks', () => hash);
    expect(whileHere(ctx, (now) => seen.push(now.hash))).toBe(true);
    hash = '#/drinks?sort=changed&sheet=filters';
    whileHere(ctx, (now) => seen.push(now.hash));
    expect(seen).toEqual(['#/drinks?sort=template', '#/drinks?sort=changed&sheet=filters']);
  });

  test('is dropped once the address is another screen', () => {
    const seen: string[] = [];
    for (const away of [
      '#/drinks/new',
      '#/drinks/daiquiri',
      '#/stock',
      '#/drinks/new?template=martini',
    ]) {
      expect(
        whileHere(
          contextAt('#/drinks', () => away),
          (now) => seen.push(now.hash),
        ),
      ).toBe(false);
    }
    expect(seen).toEqual([]);
  });
});
