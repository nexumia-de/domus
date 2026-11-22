// Reports as GitHub issues (docs/feedback.md): the body, the issue form's address, the request
// with the user's token against a fake `fetch`, and the web token store on a fake Storage. The
// dialogs themselves are checked in the apps (browser) and by the native smoke check; not proven
// here: the live GitHub API, which forms GitHub really prefills, a real keyring.
import { describe, expect, test } from 'vitest';
import {
  ISSUE_REPOSITORY,
  MAX_URL,
  TOKEN_URL,
  createIssue,
  feedbackDe,
  feedbackEn,
  formUrl,
  issueBody,
  issueLabels,
  issueUrl,
  nativeDevice,
  shortened,
  webDevice,
  type Report,
} from '../src/index';
import { TOKEN_KEY, browserTokenStore } from '../src/frame/report-token';

const REPO = 'suitably/demo';
const PROBLEM: Report = {
  kind: 'problem',
  title: 'List stays empty',
  text: 'It shows no items.',
  app: 'Shopping List',
  version: '1.2.0',
  device: 'Phone (Phosh)',
};
const query = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams.entries());

describe('report', () => {
  test('the device follows the desktop or the pointer', () => {
    expect(nativeDevice('Phosh:GNOME')).toBe('Phone (Phosh)');
    expect(nativeDevice('GNOME')).toBe('Desktop');
    expect(nativeDevice(null)).toBe('Desktop');
    expect(webDevice(true)).toBe('Phone (browser)');
    expect(webDevice(false)).toBe('Desktop (browser)');
  });

  test('the body reads like the bug form', () => {
    expect(issueBody(PROBLEM)).toBe(
      '### What happened\n\nIt shows no items.\n\n### App\n\nShopping List\n\n' +
        '### Version\n\n1.2.0\n\n### Device\n\nPhone (Phosh)',
    );
    expect(issueLabels(PROBLEM)).toEqual(['bug']);
  });

  test('an idea has the text and the app only', () => {
    const idea: Report = { ...PROBLEM, kind: 'idea', title: 'Dark list', text: '' };
    expect(issueBody(idea)).toBe(
      '### What do you want to do\n\n_No response_\n\n### App\n\nShopping List',
    );
    expect(issueLabels(idea)).toEqual(['enhancement']);
  });

  test('the form address fills the template fields', () => {
    const url = new URL(formUrl(REPO, PROBLEM));
    expect(url.origin + url.pathname).toBe(`https://github.com/${REPO}/issues/new`);
    expect(query(url.href)).toEqual({
      template: 'bug.yml',
      title: 'List stays empty',
      what: 'It shows no items.',
      app: 'Shopping List',
      version: '1.2.0',
      device: 'Phone (Phosh)',
    });
    const idea: Report = { ...PROBLEM, kind: 'idea', title: 'Dark list', text: 'Night use' };
    expect(query(formUrl(REPO, idea))).toEqual({
      template: 'feature.yml',
      title: 'Dark list',
      problem: 'Night use',
      app: 'Shopping List',
    });
  });

  test('a long text is shortened with a note, and said to be', () => {
    const long: Report = { ...PROBLEM, text: 'ä '.repeat(6000) };
    const url = formUrl(REPO, long);
    expect(url.length).toBeLessThanOrEqual(MAX_URL);
    // Most of the room is used: the cut is measured in the encoded length.
    expect(url.length).toBeGreaterThan(MAX_URL - 200);
    expect(query(url).what?.endsWith('please paste the rest]')).toBe(true);
    expect(shortened(REPO, long)).toBe(true);
    expect(shortened(REPO, PROBLEM)).toBe(false);
    // The same encoding as a browser form: a space is `+`.
    expect(formUrl(REPO, PROBLEM)).toContain('title=List+stays+empty');
  });

  test('the About link is the bug form with app, version and device', () => {
    expect(query(issueUrl('Drink Builder', '0.3.0', 'Desktop'))).toEqual({
      template: 'bug.yml',
      app: 'Drink Builder',
      version: '0.3.0',
      device: 'Desktop',
    });
    expect(issueUrl('Drink Builder', '0.3.0', 'Desktop')).toContain(
      `https://github.com/${ISSUE_REPOSITORY}/issues/new?`,
    );
  });

  test('the token link asks for a classic token with public_repo', () => {
    expect(TOKEN_URL.startsWith('https://github.com/settings/tokens/new?')).toBe(true);
    expect(query(TOKEN_URL)).toEqual({ scopes: 'public_repo', description: 'Report a Problem' });
  });

  test('both languages have every word', () => {
    expect(Object.keys(feedbackDe).sort()).toEqual(Object.keys(feedbackEn).sort());
    expect(feedbackDe.intro('Haushalt')).toContain('Haushalt');
  });
});

interface Call {
  url: string;
  init: RequestInit;
}
function fakeGithub(answer: (call: Call) => Response | Error): {
  fetch: typeof fetch;
  calls: Call[];
} {
  const calls: Call[] = [];
  const fake = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    const result = answer(call);
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  };
  return { fetch: fake as typeof fetch, calls };
}
const json = (status: number, data: unknown): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

describe('createIssue', () => {
  test('sends title, body and labels with the token', async () => {
    const github = fakeGithub(() =>
      json(201, { number: 7, html_url: `https://github.com/${REPO}/issues/7` }),
    );
    const result = await createIssue({ repo: REPO, token: 'good', report: PROBLEM, ...github });
    expect(result).toEqual({ ok: true, url: `https://github.com/${REPO}/issues/7` });
    const [call] = github.calls;
    expect(call?.url).toBe(`https://api.github.com/repos/${REPO}/issues`);
    expect(call?.init.method).toBe('POST');
    const headers = call?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer good');
    expect(headers.Accept).toBe('application/vnd.github+json');
    expect(JSON.parse(String(call?.init.body))).toEqual({
      title: 'List stays empty',
      body: issueBody(PROBLEM),
      labels: ['bug'],
    });
  });

  test.each([401, 403, 404])('answer %i: no access', async (status) => {
    const github = fakeGithub(() => json(status, { message: 'Bad credentials' }));
    expect(await createIssue({ repo: REPO, token: 'bad', report: PROBLEM, ...github })).toEqual({
      ok: false,
      failure: 'no-access',
    });
  });

  test('no connection: offline', async () => {
    const github = fakeGithub(() => new TypeError('Failed to fetch'));
    expect(await createIssue({ repo: REPO, token: 'good', report: PROBLEM, ...github })).toEqual({
      ok: false,
      failure: 'offline',
    });
  });

  test('another answer or no address: failed', async () => {
    for (const answer of [json(422, {}), json(201, {}), new Response('x', { status: 201 })]) {
      const github = fakeGithub(() => answer);
      expect(await createIssue({ repo: REPO, token: 'good', report: PROBLEM, ...github })).toEqual({
        ok: false,
        failure: 'failed',
      });
    }
  });

  test('the API base is injectable', async () => {
    const github = fakeGithub(() => json(201, { html_url: 'https://github.com/x/y/issues/1' }));
    await createIssue({
      repo: REPO,
      token: 'good',
      report: PROBLEM,
      apiBase: 'http://127.0.0.1:9',
      ...github,
    });
    expect(github.calls[0]?.url).toBe(`http://127.0.0.1:9/repos/${REPO}/issues`);
  });
});

describe('browserTokenStore', () => {
  function memoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (key) => map.get(key) ?? null,
      key: (index) => [...map.keys()][index] ?? null,
      removeItem: (key) => void map.delete(key),
      setItem: (key, value) => void map.set(key, value),
    };
  }

  test('keeps, reads and forgets the token under one key', () => {
    const storage = memoryStorage();
    const tokens = browserTokenStore(storage);
    expect(tokens.get()).toBeUndefined();
    tokens.set('github_pat_x');
    expect(storage.getItem(TOKEN_KEY)).toBe('github_pat_x');
    expect(tokens.get()).toBe('github_pat_x');
    tokens.clear();
    expect(tokens.get()).toBeUndefined();
  });

  test('a storage that throws keeps nothing and breaks nothing', () => {
    const broken = memoryStorage();
    broken.getItem = () => {
      throw new Error('blocked');
    };
    broken.setItem = () => {
      throw new Error('blocked');
    };
    const tokens = browserTokenStore(broken);
    expect(() => tokens.set('x')).not.toThrow();
    expect(tokens.get()).toBeUndefined();
    expect(browserTokenStore(null).get()).toBeUndefined();
  });
});
