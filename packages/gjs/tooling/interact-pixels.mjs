// Reads pixels of the page by way of a canvas copy of a Playwright screenshot.
import { readFileSync } from 'node:fs';

/** [r, g, b] of the viewport pixel, by decoding a screenshot in the page. */
export async function pixelAt(s, x, y) {
  const png = await s.page.screenshot();
  return s.page.evaluate(
    async ([data, x, y]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return [...g.getImageData(x, y, 1, 1).data];
    },
    [png.toString('base64'), x, y],
  );
}

export const isRed = (p) => p[0] > 180 && p[1] < 80 && p[2] < 80;
export const isBlue = (p) => p[2] > 180 && p[0] < 110 && p[2] - p[0] > 90;

/** Rows of the column x around y for which `want` holds, as one run. */
export async function heightOf(s, x, y, want) {
  const png = await s.page.screenshot();
  const column = await s.page.evaluate(
    async ([data, x]) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(x, 0, 1, img.height).data;
      return Array.from({ length: img.height }, (_, i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    },
    [png.toString('base64'), x],
  );
  if (!want(column[y])) return 0;
  let top = y;
  let bottom = y;
  while (top > 0 && want(column[top - 1])) top--;
  while (bottom < column.length - 1 && want(column[bottom + 1])) bottom++;
  return bottom - top + 1;
}

/**
 * Share of pixels that differ between two PNG files inside the list area (the
 * header buttons and the overlay scroll bar are left out, they depend on the pointer).
 */
export async function difference(s, a, b) {
  const files = [a, b].map((f) => readFileSync(f).toString('base64'));
  return s.page.evaluate(async (data) => {
    const read = async (base64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 50, 340, img.height - 50 - 40).data;
    };
    const [x, y] = [await read(data[0]), await read(data[1])];
    let differing = 0;
    for (let i = 0; i < x.length; i += 4) {
      if (
        Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) >
        30
      )
        differing++;
    }
    return differing / (x.length / 4);
  }, files);
}

/**
 * How far the content moved up between two PNG files of a scrolling page: the shift `dy` for
 * which the band of `before` from `top` to `bottom` (x from 0 to `width`) matches `after` best,
 * and the share of pixels that still differ at that shift. `dy` is 0 when it did not move.
 */
export async function scrolledBy(s, before, after, { top = 60, bottom = 640, width = 340 } = {}) {
  const files = [before, after].map((f) => readFileSync(f).toString('base64'));
  return s.page.evaluate(
    async ([data, top, bottom, width]) => {
      const read = async (base64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${base64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, width, img.height).data;
      };
      const [a, b] = [await read(data[0]), await read(data[1])];
      const differs = (dy) => {
        let n = 0;
        let all = 0;
        for (let y = top + dy; y < bottom; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4;
            const j = ((y - dy) * width + x) * 4;
            all++;
            const d =
              Math.abs(a[i] - b[j]) + Math.abs(a[i + 1] - b[j + 1]) + Math.abs(a[i + 2] - b[j + 2]);
            if (d > 30) n++;
          }
        }
        return all === 0 ? 1 : n / all;
      };
      let best = { dy: 0, rest: differs(0) };
      for (let dy = 1; dy < bottom - top - 60; dy++) {
        const rest = differs(dy);
        if (rest < best.rest) best = { dy, rest };
      }
      return best;
    },
    [files, top, bottom, width],
  );
}
