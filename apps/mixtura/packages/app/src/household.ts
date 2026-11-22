// The Household app is at the root of the address, one folder above this app
// (docs/deployment.md): spaces, storages, invites and sync are set up there.

/** The address of the Household app, or of one space in it. */
export const householdHref = (spaceId?: string): string =>
  spaceId === undefined ? '../' : `../#/spaces/${spaceId}`;
