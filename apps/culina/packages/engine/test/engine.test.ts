import { expect, test } from 'vitest';
import { engineName } from '../src/index';

test('the engine is named', () => {
  expect(engineName()).toBe('culina-engine');
});
