import { expect, test } from 'vitest';
import { appTitle } from '../src/index';

test('the placeholder app reaches the engine through its entry point', () => {
  expect(appTitle()).toBe("Cook's Notebook on culina-engine");
});
