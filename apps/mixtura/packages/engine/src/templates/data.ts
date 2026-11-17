// The six root templates, read from data/templates/*.json (docs/templates.md).
import daiquiri from '../../data/templates/daiquiri.json';
import flip from '../../data/templates/flip.json';
import highball from '../../data/templates/highball.json';
import martini from '../../data/templates/martini.json';
import oldFashioned from '../../data/templates/old-fashioned.json';
import sidecar from '../../data/templates/sidecar.json';
import type { Template } from './types';

/** The six root templates (Old-Fashioned, Martini, Daiquiri, Sidecar, Highball, Flip) as data, with slots in parts and usual ranges in percent and g per 100 ml; all ratios are assumptions (docs/templates.md). */
export const ROOT_TEMPLATES: readonly Template[] = [
  oldFashioned,
  martini,
  daiquiri,
  sidecar,
  highball,
  flip,
] as unknown as Template[];
