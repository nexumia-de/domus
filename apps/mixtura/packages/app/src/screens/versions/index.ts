// The versions of a drink (#26): `#/drinks/<id>/versions` lists them,
// `?a=1&b=3` compares two, `#/drinks/<id>/v/<n>` shows one read-only.
// Docs: docs/screens-specs.md#versions-and-diff.

import { type Route } from '../../router';
import { type Screen, type ScreenContext } from '../../screen';
import { modelOr } from './common';
import { diffView } from './diff-view';
import { listView } from './list-view';
import { versionView } from './version-view';

const isDrink = (route: Route): boolean => route.path[0] === 'drinks' && route.path.length >= 3;
const isList = (route: Route): boolean =>
  isDrink(route) && route.path.length === 3 && route.path[2] === 'versions';
const isOne = (route: Route): boolean =>
  isDrink(route) && route.path.length === 4 && route.path[2] === 'v';

export const screens: Screen[] = [
  {
    id: 'versions',
    destination: 'drinks',
    pushed: true,
    match: isList,
    view(context: ScreenContext) {
      const ready = modelOr(context);
      if ('view' in ready) return ready.view;
      const id = context.route.path[1] ?? '';
      const a = Number(context.route.query.get('a'));
      const b = Number(context.route.query.get('b'));
      return Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0
        ? diffView(context, ready.model, id, a, b)
        : listView(context, ready.model, id);
    },
  },
  {
    id: 'version',
    destination: 'drinks',
    pushed: true,
    match: isOne,
    view(context: ScreenContext) {
      const ready = modelOr(context);
      if ('view' in ready) return ready.view;
      return versionView(
        context,
        ready.model,
        context.route.path[1] ?? '',
        Number(context.route.path[3]),
      );
    },
  },
];
