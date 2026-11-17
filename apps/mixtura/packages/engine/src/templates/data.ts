// The six root templates, read from data/templates/*.json (docs/templates.md).
import daiquiri from '../../data/templates/daiquiri.json';
import flip from '../../data/templates/flip.json';
import highball from '../../data/templates/highball.json';
import martini from '../../data/templates/martini.json';
import oldFashioned from '../../data/templates/old-fashioned.json';
import sidecar from '../../data/templates/sidecar.json';
import type { Template } from './types';

/** In the order of the practice document. */
export const ROOT_TEMPLATES: readonly Template[] = [
  oldFashioned,
  martini,
  daiquiri,
  sidecar,
  highball,
  flip,
] as unknown as Template[];
