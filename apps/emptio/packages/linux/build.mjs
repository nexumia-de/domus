// Builds the native app into dist/: `npm run build -w @emptio/linux`. The build itself
// is the shared one (packages/gjs/tooling/build.mjs).
import { fileURLToPath } from 'node:url';
import { buildApp as build, metainfoVersion as version } from '@nexumia-de/gjs/tooling/build';

const root = fileURLToPath(new URL('.', import.meta.url));

export const APP_ID = 'de.nexumia.Emptio';

/** The version of the newest stable release in the metainfo (`release.toml`; the tag `emptio-v<version>`). */
export const metainfoVersion = () => version(`${root}data/${APP_ID}.metainfo.xml`);

/** @param {{ outfile?: string, githubApi?: string }} [options] */
export const buildApp = (options = {}) => build({ root, appId: APP_ID, ...options });

if (process.argv[1] === import.meta.filename) {
  console.log(`dist: ${await buildApp()}`);
}
