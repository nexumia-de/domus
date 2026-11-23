// Helpers for interact.mjs: a Broadway session (gtk4-broadwayd, a private
// D-Bus session, the app, Chromium via Playwright). The steps follow
// phosh-toolkit/scripts/screenshot.sh, written in Node so the page can be
// clicked after the start.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const portInUse = (port) =>
  new Promise((done) => {
    const socket = connect(port, '127.0.0.1');
    socket.on('connect', () => (socket.destroy(), done(true)));
    socket.on('error', () => done(false));
  });

// The window is the surface element with the most visible area. Its content can be taller than
// the screen (a long list is drawn in full and clipped), so only the part inside the viewport counts.
const findWindow = () => {
  let best = null;
  let area = 0;
  for (const top of document.body.children) {
    for (const el of top.querySelectorAll('div')) {
      const r = el.getBoundingClientRect();
      const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (w > 0 && h > 0 && w * h > area) {
        area = w * h;
        best = r.toJSON();
      }
    }
  }
  return best;
};

/** Everything started by sessions, so a failure can still clean up. */
const live = new Set();
export async function stopAll() {
  for (const session of [...live]) await session.stop();
}

export class Session {
  /**
   * @param {{ appId: string, dataEnv: string, gjsFile: string, dataDir: string, width: number, height: number, lang?: 'en' | 'de' }} o
   *   `dataEnv` is the variable that points the app at a folder of recorded data.
   */
  constructor(o) {
    this.o = o;
    this.procs = [];
    this.busPid = undefined;
    this.work = mkdtempSync(join(tmpdir(), 'gjs-interact-'));
    this.log = '';
    live.add(this);
  }

  async start() {
    const { width, height } = this.o;
    let display;
    for (let n = 5; n <= 40; n++) {
      if (!(await portInUse(8080 + n))) {
        display = n;
        break;
      }
    }
    if (display === undefined) throw new Error('no free Broadway port');
    const port = 8080 + display;
    const runtime = join(this.work, 'run');
    mkdirSync(runtime, { mode: 0o700 });
    const env = { ...process.env, XDG_RUNTIME_DIR: runtime };
    const bus = spawnSync(
      'dbus-daemon',
      ['--session', '--fork', '--nopidfile', '--print-address=1', '--print-pid=1'],
      { encoding: 'utf8', env },
    );
    const [address, pid] = bus.stdout.trim().split('\n');
    this.busPid = Number(pid);
    this.bus = address;
    // Broadway reports gtk-xft-dpi as unset; give 96 dpi (toolkit quirk).
    mkdirSync(join(this.work, 'xdg/gtk-4.0'), { recursive: true });
    writeFileSync(join(this.work, 'xdg/gtk-4.0/settings.ini'), '[Settings]\ngtk-xft-dpi=98304\n');
    this.spawn(
      'gtk4-broadwayd',
      ['--address', '127.0.0.1', '--port', String(port), `:${display}`],
      env,
    );
    for (let i = 0; i < 50 && !(await portInUse(port)); i++) await sleep(100);

    // Chromium stays off the app's bus; the browser connects before the app starts.
    this.browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: '' },
    });
    this.page = await this.browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await this.page.goto(`http://127.0.0.1:${port}/`);
    await this.page.waitForTimeout(500);

    this.app = this.spawn('gjs', ['-m', this.o.gjsFile], {
      ...env,
      DBUS_SESSION_BUS_ADDRESS: address,
      GDK_BACKEND: 'broadway',
      BROADWAY_DISPLAY: `:${display}`,
      GSETTINGS_BACKEND: 'memory',
      // The report dialog's token never reaches a real keyring (docs/feedback.md).
      DOMUS_TEST_KEYRING: 'memory',
      XDG_CONFIG_DIRS: `${join(this.work, 'xdg')}:/etc/xdg`,
      [this.o.dataEnv]: this.o.dataDir,
      LANG: this.o.lang === 'de' ? 'de_DE.UTF-8' : 'en_US.UTF-8',
      LANGUAGE: this.o.lang ?? 'en',
    });
    let win = null;
    for (const end = Date.now() + 30000; !win && Date.now() < end;) {
      if (this.app.exitCode !== null) throw new Error(`app exited early:\n${this.log.slice(-800)}`);
      await this.page.waitForTimeout(250);
      win = await this.page.evaluate(findWindow);
    }
    if (!win) throw new Error('no window appeared within 30 s');
    await this.page.waitForTimeout(500);
    win = await this.page.evaluate(findWindow);
    if (process.env.INTERACT_DEBUG) console.error('window', JSON.stringify(win));
    const filled = win.x <= 0 && win.y <= 0 && win.width >= width && win.height >= height;
    if (!filled) {
      // No window manager: a double click on the header bar maximizes (toolkit quirk).
      const left = Math.max(win.x, 0);
      const right = Math.min(win.x + win.width, width);
      await this.page.mouse.dblclick((left + right) / 2, win.y + 4);
      await this.page.mouse.move(width - 1, height - 1);
    }
    await this.page.waitForTimeout(1500);
    // The first press after the start is lost unless the pointer has moved over the window.
    for (const [x, y] of [
      [180, 300],
      [181, 302],
      [200, 320],
    ]) {
      await this.page.mouse.move(x, y);
      await this.page.waitForTimeout(200);
    }
  }

  spawn(cmd, args, env) {
    const p = spawn(cmd, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    const take = (d) => (this.log += d);
    p.stdout.on('data', take);
    p.stderr.on('data', take);
    this.procs.push(p);
    return p;
  }

  /** Activates an app.* action over the private bus. */
  activate(name) {
    const r = spawnSync(
      'gdbus',
      [
        'call',
        '--session',
        '--dest',
        this.o.appId,
        '--object-path',
        `/${this.o.appId.replaceAll('.', '/')}`,
        '--method',
        'org.gtk.Actions.Activate',
        name,
        '[]',
        '{}',
      ],
      { env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: this.bus }, encoding: 'utf8' },
    );
    if (r.status !== 0) throw new Error(`activate ${name}: ${r.stderr}`);
  }

  async click(x, y) {
    // Broadway needs a pointer motion first, or the first press is lost.
    await this.page.mouse.move(x < 180 ? 350 : 10, 400, { steps: 3 });
    await this.page.waitForTimeout(250);
    await this.page.mouse.move(x - 3, y - 3, { steps: 3 });
    await this.page.waitForTimeout(100);
    await this.page.mouse.move(x, y);
    await this.page.waitForTimeout(200);
    await this.page.mouse.down();
    await this.page.waitForTimeout(60);
    await this.page.mouse.up();
    await this.page.waitForTimeout(900);
  }

  /**
   * One touch of one finger, as Broadway's page reads it: a touchstart, `steps` touchmoves to
   * (toX, toY), a touchend. The events are made in the page and sent to the element of the
   * window's surface, not through Chromium's input (CDP): Chromium sends the moves of a touch to
   * the element it started on, and Broadway replaces that element when GTK redraws the spot
   * under the finger (a row that shows it is pressed), so the moves never reached GTK and a drag
   * stopped after a few pixels. The first finger is the one GTK treats as the pointer, as on a
   * phone.
   */
  async touch(x, y, toX = x, toY = y, { steps = 20, stepMs = 16 } = {}) {
    const send = (type, px, py) =>
      this.page.evaluate(
        ([type, px, py]) => {
          if (type === 'touchstart') {
            let el = document.elementFromPoint(px, py);
            while (el && el.surface === undefined) el = el.parentNode;
            window.__touchTarget = el;
          }
          const target = window.__touchTarget;
          if (!target) throw new Error('no Broadway surface under the touch');
          const t = new Touch({
            identifier: 1,
            target,
            clientX: px,
            clientY: py,
            pageX: px,
            pageY: py,
          });
          const down = type === 'touchend' ? [] : [t];
          target.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: down,
              targetTouches: down,
              changedTouches: [t],
            }),
          );
        },
        [type, px, py],
      );
    await send('touchstart', x, y);
    const moving = toX !== x || toY !== y;
    for (let i = 1; moving && i <= steps; i++) {
      await this.page.waitForTimeout(stepMs);
      await send('touchmove', x + ((toX - x) * i) / steps, y + ((toY - y) * i) / steps);
    }
    await this.page.waitForTimeout(moving ? stepMs : 60);
    await send('touchend', toX, toY);
    await this.page.waitForTimeout(900);
  }

  async type(text) {
    await this.page.keyboard.type(text, { delay: 30 });
  }

  async press(key) {
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(600);
  }

  async shot(file) {
    await this.page.mouse.move(this.o.width - 1, this.o.height - 1);
    await this.page.waitForTimeout(300);
    if (file) await this.page.screenshot({ path: file });
  }

  async stop() {
    live.delete(this);
    try {
      await this.browser?.close();
    } catch {
      // already gone
    }
    for (const p of this.procs) p.kill('SIGKILL');
    if (this.busPid) {
      try {
        process.kill(this.busPid);
      } catch {
        // already gone
      }
    }
    await sleep(200);
    rmSync(this.work, { recursive: true, force: true });
  }
}

export { existsSync };
