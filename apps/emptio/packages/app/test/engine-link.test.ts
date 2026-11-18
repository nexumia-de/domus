import { PRIORITIES } from '@emptio/engine';
import { describe, expect, it } from 'vitest';
import { VISIBLE_NAME } from '../src/names';

describe('the app package', () => {
  it('reaches the engine through its public entry', () => {
    expect(PRIORITIES).toHaveLength(3);
  });

  it('carries the visible name', () => {
    expect(VISIBLE_NAME).toBe('Shopping List');
  });
});
