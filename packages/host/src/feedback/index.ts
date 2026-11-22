// Report a problem or an idea from inside the app as a GitHub issue (docs/feedback.md): the
// report, the request with the user's own token, and the dialog's words. The web dialog is in
// the frame, the native one in packages/gjs.
export {
  DEVICES,
  ISSUE_REPOSITORY,
  KINDS,
  MAX_URL,
  REPORT_KINDS,
  TOKEN_URL,
  formUrl,
  issueBody,
  issueLabels,
  issueUrl,
  nativeDevice,
  shortened,
  webDevice,
  type Device,
  type Report,
  type ReportKind,
} from './report';
export { createIssue, type SendFailure, type SendOptions, type SendResult } from './github-issue';
export { feedbackDe, feedbackEn, type FeedbackTexts } from './texts';
