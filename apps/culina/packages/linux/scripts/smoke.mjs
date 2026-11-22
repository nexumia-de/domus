// `npm run smoke -w @culina/linux`: the shared smoke check in GJS (packages/gjs),
// on the collection `stock` that Culina shares with Mixtura and Emptio in a space.
import { runSmoke } from '@nexumia-de/gjs/tooling/smoke';

process.exit(await runSmoke({ collection: 'stock' }));
