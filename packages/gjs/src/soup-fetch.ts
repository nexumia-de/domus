// `fetch` as the storage adapters use it, on libsoup: method, headers, a text
// body; the answer's status, headers and text. No cookies and no cache are
// kept. A request that got no answer rejects with a TypeError, as in a
// browser, which the adapters turn into "unreachable".
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';

Gio._promisify(Soup.Session.prototype, 'send_and_read_async', 'send_and_read_finish');

/** The answer of a request; the adapters ask `instanceof Response`, so it is the global one. */
class Answer {
  readonly ok: boolean;
  readonly headers: { get(name: string): string | null };
  constructor(
    readonly status: number,
    header: (name: string) => string | null,
    private readonly body: string,
  ) {
    this.ok = status >= 200 && status < 300;
    this.headers = { get: header };
  }
  text(): Promise<string> {
    return Promise.resolve(this.body);
  }
  json(): Promise<unknown> {
    try {
      return Promise.resolve(JSON.parse(this.body) as unknown);
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
(globalThis as Record<string, unknown>)['Response'] ??= Answer;

interface Init {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export function soupFetch(userAgent: string): typeof fetch {
  const session = new Soup.Session({ user_agent: userAgent, timeout: 30 });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const run = async (input: string | URL | Request, init: Init = {}): Promise<Response> => {
    const url = String(input);
    let message;
    try {
      message = Soup.Message.new(init.method ?? 'GET', url);
    } catch {
      message = null;
    }
    if (message === null) throw new TypeError(`Not an address: ${url}`);
    const sent = message.get_request_headers();
    for (const [name, value] of Object.entries(init.headers ?? {})) sent.replace(name, value);
    if (init.body !== undefined) {
      message.set_request_body_from_bytes(
        sent.get_one('Content-Type') ?? 'application/json',
        new GLib.Bytes(encoder.encode(init.body)),
      );
    }
    let bytes;
    try {
      bytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    } catch (error) {
      throw new TypeError(`No answer from ${message.get_uri().get_host()}: ${String(error)}`, {
        cause: error,
      });
    }
    const status: number = message.get_status();
    const got = message.get_response_headers();
    const text = decoder.decode(bytes.get_data() ?? new Uint8Array(0));
    return new Answer(status, (name) => got.get_one(name) ?? null, text) as unknown as Response;
  };
  return run as unknown as typeof fetch;
}
