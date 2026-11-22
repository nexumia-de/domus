// Create a GitHub issue with the user's own token (REST API, docs/feedback.md). Nothing here
// logs, and no result carries the token, the title or the text.
import { issueBody, issueLabels, type Report } from './report';

/** Why sending failed, for the dialog's message. */
export type SendFailure =
  /** The token was rejected, or it may not write issues in the repository. */
  | 'no-access'
  /** No connection to GitHub. */
  | 'offline'
  /** Anything else. */
  | 'failed';

export type SendResult = { ok: true; url: string } | { ok: false; failure: SendFailure };

export interface SendOptions {
  /** `owner/name`. */
  repo: string;
  token: string;
  report: Report;
  fetch: typeof fetch;
  /** Base of the REST API; default `https://api.github.com`, injectable for tests. */
  apiBase?: string;
}

/**
 * Opens an issue; on success its web address. GitHub ignores the labels when the token's user
 * may not set them.
 */
export async function createIssue(options: SendOptions): Promise<SendResult> {
  const { repo, token, report } = options;
  const apiBase = options.apiBase ?? 'https://api.github.com';
  let answer: Response;
  try {
    answer = await options.fetch(`${apiBase}/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: report.title.trim(),
        body: issueBody(report),
        labels: issueLabels(report),
      }),
    });
  } catch {
    return { ok: false, failure: 'offline' };
  }
  if (answer.status === 401 || answer.status === 403 || answer.status === 404)
    return { ok: false, failure: 'no-access' };
  if (!answer.ok) return { ok: false, failure: 'failed' };
  try {
    const url = ((await answer.json()) as { html_url?: unknown }).html_url;
    return typeof url === 'string' && url.startsWith('https://')
      ? { ok: true, url }
      : { ok: false, failure: 'failed' };
  } catch {
    return { ok: false, failure: 'failed' };
  }
}
