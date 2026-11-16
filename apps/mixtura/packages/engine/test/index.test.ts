import { expect, test } from 'vitest';
import { engineName } from '../src/index';

test('the engine exports its name', () => {
  expect(engineName()).toBe('mixtura-engine');
});
