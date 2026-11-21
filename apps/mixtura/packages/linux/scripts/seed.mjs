// `node scripts/seed.mjs <folder> [en|de]`: writes the recorded stock into a
// folder for MIXTURA_DATA_DIR (checks and screenshots).
import { runSeed } from '@nexumia-de/gjs/tooling/seed';

await runSeed(`${import.meta.dirname}/seed-entry.ts`);
