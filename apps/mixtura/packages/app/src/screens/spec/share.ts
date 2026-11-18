// Share on the spec screen: the header button for a drink of the user's own
// and the sheet it opens (`?sheet=share`, so Back closes it like the batch
// sheet). A built-in drink has nothing to send: no button, and a sheet address
// typed by hand opens nothing (docs/screens-specs.md#share-a-drink).

import { shareSheet } from '../../components/share-sheet';
import * as glyph from '../../components/glyphs';
import { h } from '../../dom';
import { back, go, replace } from '../../navigation';
import { type Route } from '../../router';
import { type ScreenContext } from '../../screen';
import { createShareSender } from '../../share/send';
import { shareStrings } from '../../share/strings';
import { specAddress } from './servings';

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;
let wasOpen = false;

export interface ShareParts {
  /** The button for the header bar. */
  headerAction?: HTMLElement;
  /** The sheet, when the address asks for it. */
  sheet?: HTMLElement;
}

/**
 * The share button and sheet of a drink.
 * @param context The screen's context.
 * @param route The spec screen's route.
 * @param spec The drink: its newest version's id, its name and whether it is the user's own.
 * @param servings The servings of the address, kept when the sheet opens and closes.
 */
export function shareParts(
  context: ScreenContext,
  route: Route,
  spec: { id: string; name: string; own: boolean },
  servings: number,
): ShareParts {
  const { store, data } = context;
  const open = spec.own && route.query.get('sheet') === 'share';
  const sender = createShareSender(store, data.local);
  // The link is made when the sheet opens, each time, from the data as it is then.
  if (open && !wasOpen) queueMicrotask(() => void sender.prepare(spec.id, spec.name));
  wasOpen = open;
  if (!spec.own) return {};
  const close = (): void => {
    const to = specAddress(route, servings, null);
    if (wide()) replace(store, to);
    else back(store, to);
  };
  const headerAction = h(
    'button',
    {
      class: 'btn btn--icon',
      type: 'button',
      'aria-label': shareStrings.buttonAria(spec.name),
      title: shareStrings.button,
      'data-focus': 'share',
      onclick: () => (wide() ? replace : go)(store, specAddress(route, servings, 'share')),
    },
    glyph.share(),
  );
  if (!open) return { headerAction };
  return {
    headerAction,
    sheet: shareSheet(context.state.share, spec.name, sender, close),
  };
}
