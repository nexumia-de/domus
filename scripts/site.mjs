// What the one address serves (docs/deployment.md): the Household app at the root and
// every app that has a build, each in the folder of its name.
export const apps = [
  {
    name: 'mixtura',
    dist: 'apps/mixtura/packages/app/dist',
    cachePrefix: 'mixtura-',
    db: 'mixtura',
  },
  { name: 'culina', dist: 'apps/culina/packages/app/dist', cachePrefix: 'culina-', db: 'culina' },
  // Emptio keeps the list in the database the apps share and has none of its own.
  { name: 'emptio', dist: 'apps/emptio/packages/app/dist', cachePrefix: 'emptio-' },
];

/**
 * The page at the root of the address: the Household app, built like the others. It has no
 * manifest and no service worker, so it claims no scope above the apps (docs/deployment.md).
 */
export const home = {
  name: 'domus',
  workspace: '@domus/app',
  dist: 'apps/domus/dist',
  db: 'domus',
};
