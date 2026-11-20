// What the build fixes. The GitHub API address is compiled in (build.mjs), so no URL
// parameter, stored setting or invite can send a token to another host.
declare const __GITHUB_API__: string | undefined;

/** `https://api.github.com` in every build but a test build. */
export const GITHUB_API: string =
  typeof __GITHUB_API__ === 'string' ? __GITHUB_API__ : 'https://api.github.com';

/** The Household app is at the root of the address, one folder above this app. */
export const householdHref = (spaceId?: string): string =>
  spaceId === undefined ? '../' : `../#/spaces/${spaceId}`;
