// The service worker: the host package's, with this app's cache prefix. The
// build defines the list of built files and a version derived from them.
import { serveFromCache, type WorkerScope } from '@nexumia-de/hospes/service-worker';

declare const PRECACHE_FILES: readonly string[];
declare const CACHE_VERSION: string;

serveFromCache(self as unknown as WorkerScope, {
  prefix: 'emptio-',
  version: CACHE_VERSION,
  files: PRECACHE_FILES,
});
