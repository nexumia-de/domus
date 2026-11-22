// The shared Report a Problem dialog (docs/feedback.md in the root), from the settings: the
// filled-in issue form without a token, a refused token, a token GitHub accepts (kept only
// then), and Forget. GitHub's API is answered by page.route: not proven here is the live API,
// nor which fields GitHub really fills in from the address.
import { ok, tapAudit } from './driver.mjs';

const API = 'https://api.github.com/repos/suitably/domus/issues';
const KEY = 'domus.feedback.github-token';

export async function reportStage(run, { page }) {
  const { server, texts } = run;
  const f = run.lang === 'de' ? texts.feedbackDe : texts.feedbackEn;
  const dialog = page.locator('dialog.fr-dialog[open]');
  const open = async () => {
    await page.getByRole('button', { name: f.open, exact: true }).click();
    await dialog.waitFor();
  };
  const fill = async () => {
    await dialog.getByLabel(f.issueTitle, { exact: true }).fill('List stays empty');
    await dialog.getByLabel(f.textHeading.problem, { exact: true }).fill('It shows no items.');
  };

  await page.goto(`${server.origin}/#/settings`);
  await page.reload();
  await page.waitForSelector('.choice');
  await page.evaluate(() => {
    window.__opened = [];
    window.open = (url) => {
      window.__opened.push(String(url));
      return null;
    };
  });
  await open();
  await ok(run, 'report: the dialog has no tap target under 44 px and no overflow', async () => {
    const a = await tapAudit(page);
    if (a.small.length || a.overflow > 0) console.log('     ', JSON.stringify(a));
    return a.small.length === 0 && a.overflow <= 0;
  });
  if (process.env.SHOTS)
    await page.screenshot({
      path: `${process.env.SHOTS}/report-${run.label.replace(/ /g, '-')}.png`,
    });
  await ok(run, 'report: without a token only Open on GitHub is offered', async () => {
    return (
      (await dialog.getByRole('button', { name: f.send, exact: true }).count()) === 0 &&
      (await dialog.getByRole('button', { name: f.openForm, exact: true }).isVisible())
    );
  });
  await fill();
  await dialog.getByRole('button', { name: f.openForm, exact: true }).click();
  await ok(run, 'report: Open on GitHub opens the filled-in bug form and closes', async () => {
    const [url] = await page.evaluate(() => window.__opened);
    const q = Object.fromEntries(new URL(url).searchParams);
    return (
      url.startsWith('https://github.com/suitably/domus/issues/new?') &&
      q.template === 'bug.yml' &&
      q.title === 'List stays empty' &&
      q.what === 'It shows no items.' &&
      q.app === 'Shopping List' &&
      q.version === 'web' &&
      /\(browser\)$/.test(q.device) &&
      (await dialog.count()) === 0
    );
  });

  const sent = [];
  let answer = 401;
  await page.route(API, async (route) => {
    const request = route.request();
    sent.push({ auth: request.headers().authorization, body: request.postDataJSON() });
    await route.fulfill(
      answer === 201
        ? {
            status: 201,
            json: { number: 1, html_url: 'https://github.com/suitably/domus/issues/1' },
          }
        : { status: answer, json: { message: 'Bad credentials' } },
    );
  });
  await open();
  await fill();
  const token = dialog.getByLabel(f.token, { exact: true });
  await token.fill('github_pat_wrong');
  await dialog.getByRole('button', { name: f.send, exact: true }).click();
  await ok(run, 'report: a refused token is said in the banner and not kept', async () => {
    await dialog.getByRole('alert').filter({ hasText: f.failed['no-access'] }).waitFor();
    return (await page.evaluate((key) => localStorage.getItem(key), KEY)) === null;
  });
  answer = 201;
  await token.fill('github_pat_good');
  await dialog.getByRole('button', { name: f.send, exact: true }).click();
  await ok(run, 'report: an accepted token creates the issue and is kept', async () => {
    await dialog.getByText(f.thanks, { exact: true }).waitFor();
    const last = sent.at(-1);
    return (
      last.auth === 'Bearer github_pat_good' &&
      last.body.title === 'List stays empty' &&
      last.body.body.startsWith('### What happened\n\nIt shows no items.') &&
      JSON.stringify(last.body.labels) === '["bug"]' &&
      !JSON.stringify(last.body).includes('github_pat') &&
      (await dialog.getByRole('link', { name: f.viewIssue }).getAttribute('href')) ===
        'https://github.com/suitably/domus/issues/1' &&
      (await page.evaluate((key) => localStorage.getItem(key), KEY)) === 'github_pat_good'
    );
  });
  await page.keyboard.press('Escape');
  await open();
  await ok(run, 'report: a kept token is shown as saved, and Forget removes it', async () => {
    const saved = await dialog.getByText(f.tokenSaved, { exact: true }).isVisible();
    const fieldHidden = !(await token.isVisible());
    await dialog.getByRole('button', { name: f.forget, exact: true }).click();
    return (
      saved &&
      fieldHidden &&
      (await token.isVisible()) &&
      (await page.evaluate((key) => localStorage.getItem(key), KEY)) === null
    );
  });
  await page.keyboard.press('Escape');
  await page.unroute(API);
  // The requests to GitHub's API were this stage's own, answered by page.route.
  for (let i = run.problems.length - 1; i >= 0; i--)
    if (run.problems[i] === `foreign request: ${API}`) run.problems.splice(i, 1);
}
