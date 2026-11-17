// Opens Chromium for the e2e scripts. Playwright's own browser is used
// unless MIXTURA_CHROMIUM names another binary (the cloud image has a
// browser build older than the pinned Playwright, docs/development.md).
import { chromium } from 'playwright';

export const launch = () =>
  chromium.launch(
    process.env.MIXTURA_CHROMIUM ? { executablePath: process.env.MIXTURA_CHROMIUM } : {},
  );
