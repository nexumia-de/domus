// Builds the native app into dist/: `npm run build -w @culina/linux`. The build itself is the
// shared one (packages/gjs/tooling/build.mjs); the shipped content (the classics, techniques,
// handling rules and substitutes: the web app's `classics.json`) and the ingredient catalogue
// are compiled in. The web app's validators are built first (`prebuild`).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildApp as build, metainfoVersion as version } from '@nexumia-de/gjs/tooling/build';

const root = fileURLToPath(new URL('.', import.meta.url));

export const APP_ID = 'de.nexumia.Culina';

/** The version of the newest stable release in the metainfo (`release.toml`; the tag `culina-v<version>`). */
export const metainfoVersion = () => version(`${root}data/${APP_ID}.metainfo.xml`);

/** @param {{ outfile?: string, githubApi?: string }} [options] */
export async function buildApp(options = {}) {
  // The content is the web app's own file, assembled from the data folders.
  const { shippedContent } = await import('@culina/app/make-classics.mjs');
  const catalogue = readFileSync(fileURLToPath(import.meta.resolve('@culina/app/catalogue.json')));
  return build({
    root,
    appId: APP_ID,
    define: {
      __CONTENT__: JSON.stringify(shippedContent()),
      __CATALOGUE__: catalogue.toString('utf8'),
    },
    ...options,
  });
}

if (process.argv[1] === import.meta.filename) {
  console.log(`dist: ${await buildApp()}`);
}
