// Templates destination: placeholder until #18 builds the overview.

import { type Screen } from '../../screen';
import { strings } from '../../strings';
import { status } from '../status';

export const screens: Screen[] = [
  {
    id: 'templates',
    destination: 'templates',
    pushed: false,
    match: (route) => route.path.length === 1 && route.path[0] === 'templates',
    view: () => ({ title: strings.titles.templates, body: status(strings.empty.templates) }),
  },
];
