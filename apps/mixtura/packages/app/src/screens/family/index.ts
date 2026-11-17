// The family of a drink (#27): `#/drinks/<id>/family`.
// Docs: docs/screens-specs.md#riff-and-family.

import { type Route } from '../../router';
import { type Screen } from '../../screen';
import { modelOr } from '../versions/common';
import { familyView } from './family-view';

const isFamily = (route: Route): boolean =>
  route.path[0] === 'drinks' && route.path.length === 3 && route.path[2] === 'family';

export const screens: Screen[] = [
  {
    id: 'family',
    destination: 'drinks',
    pushed: true,
    match: isFamily,
    view(context) {
      const ready = modelOr(context);
      if ('view' in ready) return ready.view;
      return familyView(context, ready.model, context.route.path[1] ?? '');
    },
  },
];
