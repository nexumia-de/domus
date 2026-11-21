// GJS's `gi://` modules have no types here: the platform files and the screens
// use them as they are documented, and the smoke run and the screenshots are
// what checks them (docs/native-linux.md#what-is-not-checked).
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'gi://*' {
  const namespace: any;
  export default namespace;
}
declare module 'system' {
  export const programArgs: string[];
  export function exit(code: number): never;
}
