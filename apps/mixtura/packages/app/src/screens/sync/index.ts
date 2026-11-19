// The Sync page under Settings (built by #135): `#/settings/sync`.

import { type Screen } from '../../screen';
import { syncPage } from './page';
import { leaveSyncPage } from './sheet-drafts';

export const screens: Screen[] = [
  {
    id: 'sync',
    destination: 'settings',
    pushed: true,
    match: (route) =>
      route.path.length === 2 && route.path[0] === 'settings' && route.path[1] === 'sync',
    view: syncPage,
    leave: leaveSyncPage,
  },
];
