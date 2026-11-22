// The words of the "Report a Problem" dialog, English and German, the same in the web and the
// native apps (docs/feedback.md). Pure.
import type { ReportKind } from './report';
import type { SendFailure } from './github-issue';

export interface FeedbackTexts {
  /** The menu entry or button that opens the dialog. */
  open: string;
  title: string;
  /** What is sent and where; `app` is the visible name. */
  intro: (app: string) => string;
  kind: string;
  kinds: Record<ReportKind, string>;
  /** The heading over the text field, by kind. */
  textHeading: Record<ReportKind, string>;
  issueTitle: string;
  direct: string;
  directHint: string;
  token: string;
  createToken: string;
  createTokenHint: string;
  tokenSaved: string;
  /** Where the token is kept: the keyring (native) or this browser (web). */
  keptKeyring: string;
  keptBrowser: string;
  forget: string;
  openForm: string;
  send: string;
  sending: string;
  close: string;
  failed: Record<SendFailure, string>;
  thanks: string;
  thanksText: string;
  viewIssue: string;
  /** Said when the text was too long for the address and is on the clipboard. */
  pasteRest: string;
}

export const feedbackEn: FeedbackTexts = {
  open: 'Report a Problem…',
  title: 'Report a Problem',
  intro: (app) =>
    `Goes to the public issue list of ${app} on GitHub. Only what you write here, the app version and the kind of device are sent.`,
  kind: 'Kind',
  kinds: { problem: 'Problem', idea: 'Idea' },
  textHeading: { problem: 'What happened', idea: 'What do you want to do' },
  issueTitle: 'Title',
  direct: 'Send Directly',
  directHint:
    'With a GitHub token the issue is created here. Without one, GitHub opens in the browser with everything filled in.',
  token: 'GitHub Token',
  createToken: 'Create a Token',
  createTokenHint: 'Classic, with the “public_repo” scope',
  tokenSaved: 'Token Saved',
  keptKeyring: 'Kept in the keyring',
  keptBrowser: 'Kept in this browser',
  forget: 'Forget',
  openForm: 'Open on GitHub',
  send: 'Send',
  sending: 'Sending…',
  close: 'Close',
  failed: {
    'no-access':
      'GitHub did not accept the token. Check that it may write issues in this repository.',
    offline: 'GitHub cannot be reached right now.',
    failed: 'GitHub did not create the issue.',
  },
  thanks: 'Thank You',
  thanksText: 'The issue is on GitHub.',
  viewIssue: 'View Issue',
  pasteRest: 'The text was too long for the address; the whole text is on the clipboard to paste.',
};

export const feedbackDe: FeedbackTexts = {
  open: 'Problem melden…',
  title: 'Problem melden',
  intro: (app) =>
    `Geht an die öffentliche Liste der Issues von ${app} auf GitHub. Gesendet wird nur, was hier geschrieben wird, die App-Version und die Art des Geräts.`,
  kind: 'Art',
  kinds: { problem: 'Problem', idea: 'Idee' },
  textHeading: { problem: 'Was ist passiert', idea: 'Was soll möglich sein' },
  issueTitle: 'Titel',
  direct: 'Direkt senden',
  directHint:
    'Mit einem GitHub-Token wird das Issue hier angelegt. Ohne Token öffnet sich GitHub im Browser, alles schon ausgefüllt.',
  token: 'GitHub-Token',
  createToken: 'Token erstellen',
  createTokenHint: 'Klassisch, mit dem Bereich „public_repo“',
  tokenSaved: 'Token gespeichert',
  keptKeyring: 'Im Schlüsselbund',
  keptBrowser: 'In diesem Browser',
  forget: 'Vergessen',
  openForm: 'Auf GitHub öffnen',
  send: 'Senden',
  sending: 'Wird gesendet…',
  close: 'Schließen',
  failed: {
    'no-access':
      'GitHub hat das Token nicht angenommen. Darf es Issues in diesem Repository schreiben?',
    offline: 'GitHub ist gerade nicht erreichbar.',
    failed: 'GitHub hat das Issue nicht angelegt.',
  },
  thanks: 'Danke',
  thanksText: 'Das Issue ist auf GitHub.',
  viewIssue: 'Issue ansehen',
  pasteRest:
    'Der Text war zu lang für die Adresse; der ganze Text liegt zum Einfügen in der Zwischenablage.',
};
