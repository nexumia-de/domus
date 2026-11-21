// Builds the native app into dist/: `npm run build -w @mixtura/linux`. The build itself
// is the shared one (packages/gjs/tooling/build.mjs); the built-in drink data (the web
// app's seed) is compiled in. The engine and the web app's validators are built first
// (`prebuild`).
import { fileURLToPath } from 'node:url';
import { buildApp as build, metainfoVersion as version } from '@nexumia-de/gjs/tooling/build';

const root = fileURLToPath(new URL('.', import.meta.url));

export const APP_ID = 'de.nexumia.Mixtura';

/** The version of the newest stable release in the metainfo (`release.toml`; the tag `mixtura-v<version>`). */
export const metainfoVersion = () => version(`${root}data/${APP_ID}.metainfo.xml`);

/** @param {{ outfile?: string, githubApi?: string }} [options] */
export async function buildApp(options = {}) {
  // The seed is assembled from the engine's data like the web app's; it needs the built engine.
  const { assembleSeed } = await import('@mixtura/app/seed-assemble.mjs');
  return build({
    root,
    appId: APP_ID,
    define: { __SEED__: JSON.stringify(assembleSeed()) },
    ...options,
  });
}

if (process.argv[1] === import.meta.filename) {
  console.log(`dist: ${await buildApp()}`);
}
