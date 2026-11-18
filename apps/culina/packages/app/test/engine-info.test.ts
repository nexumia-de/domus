import { expect, test } from 'vitest';
import { engineLine } from '../src/engine-info';

test('the app reaches the engine through its entry point', () => {
  expect(engineLine()).toBe('Engine: culina-engine');
});
