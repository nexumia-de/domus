// `npm run smoke -w @emptio/linux`: the shared smoke check in GJS (packages/gjs),
// on the collection `list` that Emptio keeps in a space.
import { runSmoke } from '@nexumia-de/gjs/tooling/smoke';

process.exit(await runSmoke({ collection: 'list' }));
