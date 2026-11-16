import { expect, test } from 'vitest';
import { appTitle } from '../src/title';

test('the app title names the engine it imports', () => {
  expect(appTitle()).toBe('Drink Builder on mixtura-engine');
});
