// The import screen's route, #/settings/import.
import { expect, test } from 'vitest';
import { actionFromHash, hashFor, paramFromHash, routeFromHash } from '../src/router';

test('#/settings/import is the settings route with the import action', () => {
  expect(routeFromHash('#/settings/import')).toBe('settings');
  expect(actionFromHash('#/settings/import')).toBe('import');
  expect(paramFromHash('#/settings/import')).toBeUndefined();
  expect(hashFor('settings', undefined, 'import')).toBe('#/settings/import');
});

test('anything else after settings is not an action', () => {
  expect(actionFromHash('#/settings')).toBeUndefined();
  expect(actionFromHash('#/settings/other')).toBeUndefined();
  expect(actionFromHash('#/settings/import/more')).toBeUndefined();
  expect(actionFromHash('#/components/import')).toBeUndefined();
});
