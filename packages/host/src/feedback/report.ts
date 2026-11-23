// What a report says, as a GitHub issue body or as an address of GitHub's new-issue form
// (docs/feedback.md). Follows the repository's issue forms (`.github/ISSUE_TEMPLATE/bug.yml` and
// `feature.yml`), so a report reads the same whichever way it was sent. Pure: no DOM, no `gi://`.

/** The repository every household app's issues go to. */
export const ISSUE_REPOSITORY = 'nexumia-de/domus';

export type ReportKind = 'problem' | 'idea';
export const REPORT_KINDS: readonly ReportKind[] = ['problem', 'idea'];

/**
 * The options of the forms' `device` field; a report sends one of them. The native apps say
 * `Phone (Phosh)` under Phosh, else `Desktop`; the web apps say which kind of browser.
 */
export const DEVICES = [
  'Phone (Phosh)',
  'Desktop',
  'Phone (browser)',
  'Desktop (browser)',
  'Other',
] as const;
export type Device = (typeof DEVICES)[number];

/** A form field the app fills besides the user's text. */
type Detail = 'app' | 'version' | 'device';

interface Kind {
  template: string;
  label: string;
  /** Form field id that takes the user's text, and its heading in the rendered issue. */
  field: string;
  heading: string;
  /** The other fields of the form the app fills, in the form's order. */
  details: readonly Detail[];
}

const HEADINGS: Record<Detail, string> = { app: 'App', version: 'Version', device: 'Device' };

export const KINDS: Record<ReportKind, Kind> = {
  problem: {
    template: 'bug.yml',
    label: 'bug',
    field: 'what',
    heading: 'What happened',
    details: ['app', 'version', 'device'],
  },
  idea: {
    template: 'feature.yml',
    label: 'enhancement',
    field: 'problem',
    heading: 'What do you want to do',
    details: ['app'],
  },
};

export interface Report {
  kind: ReportKind;
  title: string;
  text: string;
  /** One of the forms' `app` options: the app's English visible name. */
  app: string;
  version: string;
  device: Device;
}

/** GitHub serves addresses up to about 8 KiB; stay well below. */
export const MAX_URL = 7000;
const CUT = '\n\n[…shortened, please paste the rest]';

/**
 * A value as an HTML form encodes it (`+` for a space). Not URLSearchParams: GJS, where the
 * native apps run this, has none.
 */
const encode = (text: string): string => encodeURIComponent(text).replace(/%20/g, '+');

/** `Phone (Phosh)` when XDG_CURRENT_DESKTOP names Phosh, else `Desktop` (native apps). */
export function nativeDevice(currentDesktop: string | null | undefined): Device {
  const desktops = (currentDesktop ?? '').toLowerCase().split(':');
  return desktops.includes('phosh') ? 'Phone (Phosh)' : 'Desktop';
}

/** `Phone (browser)` when the main pointer is a finger, else `Desktop (browser)` (web apps). */
export function webDevice(coarsePointer: boolean): Device {
  return coarsePointer ? 'Phone (browser)' : 'Desktop (browser)';
}

const value = (report: Report, detail: Detail): string => report[detail];

/**
 * Markdown like GitHub renders the issue form: one `###` section per field. Only what the user
 * typed, the app, the version and the device.
 */
export function issueBody(report: Report): string {
  const kind = KINDS[report.kind];
  const sections: [string, string][] = [
    [kind.heading, report.text.trim()],
    ...kind.details.map((d): [string, string] => [HEADINGS[d], value(report, d)]),
  ];
  return sections
    .map(([heading, text]) => `### ${heading}\n\n${text === '' ? '_No response_' : text}`)
    .join('\n\n');
}

export function issueLabels(report: Report): string[] {
  return [KINDS[report.kind].label];
}

/** The filled-in form address and the text it carries, shortened where it had to be. */
function fillForm(repo: string, report: Report): { url: string; text: string } {
  const kind = KINDS[report.kind];
  let text = report.text.trim();
  for (;;) {
    const fields: [string, string][] = [
      ['template', kind.template],
      ['title', report.title.trim()],
      [kind.field, text],
      ...kind.details.map((d): [string, string] => [d, value(report, d)]),
    ];
    // An empty field is left out: the form shows its own empty field.
    const query = fields
      .filter(([, given]) => given !== '')
      .map(([name, given]) => `${name}=${encode(given)}`)
      .join('&');
    const url = `https://github.com/${repo}/issues/new?${query}`;
    if (url.length <= MAX_URL || text === '') return { url, text };
    // Keep the share of the text that fits, measured in its encoded length, less the note.
    const encoded = encode(text).length;
    const fits = Math.max(0, encoded - (url.length - MAX_URL) - encode(CUT).length);
    const keep = Math.floor((text.length * fits) / encoded);
    text = keep > 0 ? text.slice(0, keep).trimEnd() + CUT : '';
  }
}

/**
 * Address of the repository's issue form for the report's kind, filled in. Text that would make
 * the address too long is shortened with a note; the caller keeps the full text to paste.
 */
export function formUrl(repo: string, report: Report): string {
  return fillForm(repo, report).url;
}

/** Whether `formUrl` has to shorten the text, so the full text should go to the clipboard. */
export function shortened(repo: string, report: Report): boolean {
  return fillForm(repo, report).text !== report.text.trim();
}

/** The bug form with app, version and device filled in: for the About dialog's issue link. */
export function issueUrl(app: string, version: string, device: Device): string {
  return formUrl(ISSUE_REPOSITORY, { kind: 'problem', title: '', text: '', app, version, device });
}

/**
 * GitHub's form for a classic token with the `public_repo` scope ticked. A fine-grained token
 * only writes to repositories of its resource owner, so a user outside the repository's owner
 * could not send with one (docs/feedback.md).
 */
export const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=public_repo&description=Report%20a%20Problem';
