// What the one address serves (docs/deployment.md): the page at the root and
// every app that has a build, each in the folder of its name.
export const apps = [
  {
    name: 'mixtura',
    dist: 'apps/mixtura/packages/app/dist',
    cachePrefix: 'mixtura-',
    db: 'mixtura',
  },
  { name: 'culina', dist: 'apps/culina/packages/app/dist', cachePrefix: 'culina-', db: 'culina' },
];

/** The static files of the root page, copied as they are. */
export const home = { dir: 'apps/domus', files: ['index.html', 'home.css', 'icon.svg'] };
