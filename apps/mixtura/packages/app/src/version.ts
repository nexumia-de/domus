/** The app version, injected by build.mjs from package.json. */
declare const APP_VERSION: string;

export const version: string = typeof APP_VERSION === 'string' ? APP_VERSION : 'dev';
