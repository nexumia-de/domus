// Installability check: manifest fields, a service worker that controls the page, icons that load.
import { readdirSync } from 'node:fs';
import { check } from './harness.mjs';
import { controlled } from './smoke.mjs';
import { distDir } from './harness.mjs';

export const install = async (browser, server) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 720 } });
  const page = await context.newPage();
  await page.goto(server.url);
  await controlled(page);
  const result = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const manifestUrl = new URL(link.getAttribute('href'), location.href).href;
    const manifest = await (await fetch(manifestUrl)).json();
    const icons = [];
    for (const icon of manifest.icons) {
      const url = new URL(icon.src, manifestUrl).href;
      const res = await fetch(url);
      const size = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(`${img.naturalWidth}x${img.naturalHeight}`);
        img.onerror = () => resolve('error');
        img.src = url;
      });
      icons.push({
        src: icon.src,
        sizes: icon.sizes,
        purpose: icon.purpose,
        status: res.status,
        size,
      });
    }
    const cached = await (await caches.open((await caches.keys())[0])).keys();
    return {
      manifest,
      icons,
      secure: window.isSecureContext,
      controlled: !!navigator.serviceWorker.controller,
      cached: cached.length,
    };
  });
  const m = result.manifest;
  const rows = [
    ['name and short_name', !!m.name && !!m.short_name, `${m.name} / ${m.short_name}`],
    ['start_url and scope', m.start_url === './' && m.scope === './', `${m.start_url} ${m.scope}`],
    ['display standalone', m.display === 'standalone', m.display],
    [
      'theme_color and background_color',
      !!m.theme_color && !!m.background_color,
      `${m.theme_color} ${m.background_color}`,
    ],
    [
      'icon 192x192 loads',
      result.icons.some((i) => i.sizes === '192x192' && i.status === 200 && i.size === '192x192'),
      '',
    ],
    [
      'icon 512x512 loads',
      result.icons.some((i) => i.sizes === '512x512' && i.status === 200 && i.size === '512x512'),
      '',
    ],
    [
      'maskable icon loads',
      result.icons.some(
        (i) => i.purpose === 'maskable' && i.status === 200 && i.size === '512x512',
      ),
      '',
    ],
    [
      'every icon answers 200 and decodes',
      result.icons.every((i) => i.status === 200 && i.size !== 'error'),
      `${result.icons.length} icons`,
    ],
    ['secure context (localhost)', result.secure, ''],
    ['service worker controls the page', result.controlled, ''],
    [
      'precache holds every built file',
      result.cached ===
        readdirSync(distDir, { recursive: true, withFileTypes: true }).filter(
          (e) => e.isFile() && e.name !== 'sw.js',
        ).length,
      `${result.cached} files`,
    ],
  ];
  console.log('\nInstallability');
  for (const [what, ok, detail] of rows) check(ok, `${what.padEnd(36)} ${detail}`);
  console.log('');
  await context.close();
};
