import { describe, expect, it } from 'vitest';
import { DEFAULT_PRIORITY, PRIORITIES, isPriority } from '../src/index';

describe('priority', () => {
  it('has three steps, most pressing first', () => {
    expect(PRIORITIES).toEqual(['now', 'soon', 'sometime']);
  });

  it('starts new entries at soon', () => {
    expect(DEFAULT_PRIORITY).toBe('soon');
  });

  it('recognises its steps and nothing else', () => {
    expect(PRIORITIES.every(isPriority)).toBe(true);
    for (const other of ['urgent', 'Now', '', 1, null, undefined]) {
      expect(isPriority(other)).toBe(false);
    }
  });
});
