// Secrets of a native app in the keyring: libsecret, in the Flatpak through the Secret portal
// (no extra permission). Without libsecret or a keyring daemon a secret is kept in memory for
// the session only. With `memoryEnv` set to "memory" (checks, screenshots) the real keyring is
// never touched. Nothing here logs; a value never leaves this file except to its caller.
import GLib from 'gi://GLib';

export interface Keyring {
  lookup(kind: string): string | undefined;
  store(kind: string, value: string): void;
  clear(kind: string): void;
}

export interface KeyringOptions {
  /** The app id: the schema name the keyring files the secrets under. */
  appId: string;
  /** The label the keyring shows for each kind, e.g. `{ 'github-token': 'Shopping List GitHub token' }`. */
  labels: Record<string, string>;
  /** An environment variable that, set to "memory", keeps everything in memory. */
  memoryEnv?: string;
}

// libsecret, loaded on first use through GJS's `imports.gi`: a missing typelib must not stop the
// app, which a static `gi://Secret` import would.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SecretModule = any;

function loadSecret(): SecretModule {
  try {
    const gi = (globalThis as unknown as { imports: { gi: SecretModule } }).imports.gi;
    gi.versions.Secret = '1';
    return gi.Secret as SecretModule;
  } catch {
    return null;
  }
}

export function createKeyring(options: KeyringOptions): Keyring {
  const memory = new Map<string, string>();
  const useKeyring = options.memoryEnv === undefined || GLib.getenv(options.memoryEnv) !== 'memory';
  const Secret: SecretModule = useKeyring ? loadSecret() : null;
  const schema =
    Secret === null
      ? null
      : Secret.Schema.new(options.appId, Secret.SchemaFlags.NONE, {
          kind: Secret.SchemaAttributeType.STRING,
        });

  return {
    lookup(kind) {
      if (memory.has(kind)) return memory.get(kind);
      if (schema === null) return undefined;
      try {
        const value: unknown = Secret.password_lookup_sync(schema, { kind }, null);
        return typeof value === 'string' && value !== '' ? value : undefined;
      } catch {
        return undefined;
      }
    },
    store(kind, value) {
      if (schema === null) {
        memory.set(kind, value);
        return;
      }
      try {
        Secret.password_store_sync(
          schema,
          { kind },
          Secret.COLLECTION_DEFAULT,
          options.labels[kind] ?? kind,
          value,
          null,
        );
        // A copy from an earlier failed store would shadow this and every later value.
        memory.delete(kind);
      } catch {
        // No keyring daemon, locked, …: kept for this session.
        memory.set(kind, value);
      }
    },
    clear(kind) {
      memory.delete(kind);
      if (schema === null) return;
      try {
        Secret.password_clear_sync(schema, { kind }, null);
      } catch {
        // Nothing kept that could be cleared.
      }
    },
  };
}
