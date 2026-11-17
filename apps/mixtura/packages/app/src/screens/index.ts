// The list of screens. Adding a screen: write its folder, export its
// `screens` array and add one line here. Order matters only where routes
// overlap: the first match wins.

import { type Screen } from '../screen';
import { screens as drinks } from './drinks';
import { screens as editor } from './editor';
import { screens as settings } from './settings';
import { screens as spec } from './spec';
import { screens as stock } from './stock';
import { screens as templates } from './templates';

export const screens: readonly Screen[] = [
  ...drinks,
  ...editor,
  ...spec,
  ...templates,
  ...stock,
  ...settings,
];
