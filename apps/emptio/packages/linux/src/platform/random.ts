// Cryptographically strong random bytes from the kernel, for secrets, nonces and ids.
import Gio from 'gi://Gio';

export function randomBytes(length: number): Uint8Array {
  if (length === 0) return new Uint8Array(0);
  const stream = Gio.File.new_for_path('/dev/urandom').read(null);
  try {
    const out = new Uint8Array(length);
    let have = 0;
    while (have < length) {
      const chunk: Uint8Array | null = stream.read_bytes(length - have, null).get_data();
      if (chunk === null || chunk.length === 0) throw new Error('No random bytes from the system');
      out.set(chunk, have);
      have += chunk.length;
    }
    return out;
  } finally {
    stream.close(null);
  }
}
