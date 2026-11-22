// `node scripts/seed.mjs <folder> [en|de]`: writes the recorded list into a
// folder for EMPTIO_DATA_DIR (checks and screenshots).
import { runSeed } from '@nexumia-de/gjs/tooling/seed';

await runSeed(`${import.meta.dirname}/seed-entry.ts`);
