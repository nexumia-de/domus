// `node scripts/seed.mjs <folder> [en|de]`: writes the recorded stock of a small kitchen into a
// folder for CULINA_DATA_DIR (checks and screenshots).
import { runSeed } from '@nexumia-de/gjs/tooling/seed';

await runSeed(`${import.meta.dirname}/seed-entry.ts`);
