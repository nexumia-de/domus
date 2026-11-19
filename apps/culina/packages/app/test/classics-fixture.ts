// The fictional example content of the classics tests: two dishes and one technique, not recipes.
import { readFileSync } from 'node:fs';
import type { Classic, Technique } from '@culina/engine';
import { must } from './must';

const file = JSON.parse(
  readFileSync(new URL('./fixtures/classics-example.json', import.meta.url), 'utf8'),
) as { classics: Classic[]; techniques: Technique[] };

export const EXAMPLE_CLASSICS: readonly Classic[] = file.classics;
export const EXAMPLE_TECHNIQUES: readonly Technique[] = file.techniques;
export const PAN_DISH: Classic = must(file.classics[0]);
export const SECOND_DISH: Classic = must(file.classics[1]);
export const NAMES = (id: string): string => `name of ${id}`;
