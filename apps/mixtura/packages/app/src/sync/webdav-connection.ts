// "Test Connection": one read of a probe file tells the user whether the
// storage can be used. The file need not exist: a 404 is a working server.
import type { StorageAdapter } from '@mixtura/engine';

export type ConnectionState =
  /** The server answered and the page may read the answer. */
  | 'reachable'
  /** The server wants other credentials. */
  | 'unauthorised'
  /** An answer exists but the page may not read it (CORS, mixed content, missing ETag header). */
  | 'blocked'
  /** The browser is offline. */
  | 'unreachable'
  /** The server answered with an error status. */
  | 'server';

export interface ConnectionResult {
  state: ConnectionState;
  detail?: string;
}

export const PROBE_PATH = '.mixtura-probe';

export async function testConnection(
  adapter: StorageAdapter,
  probe: string = PROBE_PATH,
): Promise<ConnectionResult> {
  const result = await adapter.read(probe);
  if (result.ok) return { state: 'reachable' };
  const { failure, detail } = result;
  const state: ConnectionState =
    failure === 'unauthorised' || failure === 'blocked' || failure === 'unreachable'
      ? failure
      : 'server';
  return detail === undefined ? { state } : { state, detail };
}
