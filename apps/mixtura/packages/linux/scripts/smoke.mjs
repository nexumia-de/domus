// `npm run smoke -w @mixtura/linux`: the shared smoke check in GJS (packages/gjs),
// on the collection `stock` that Mixtura keeps in a space.
import { runSmoke } from '@nexumia-de/gjs/tooling/smoke';

process.exit(await runSmoke({ collection: 'stock' }));
