// A QR code drawn as an inline <svg> from DOM calls: the page's
// Content-Security-Policy allows no inline script and no data: image. Error
// correction level M. Dark modules on a white background with a quiet zone
// of four modules in both themes (a code must stay dark on light). No camera
// is used anywhere; the other person scans it with their own camera app.

import qrcode from 'qrcode-generator';

const SVG = 'http://www.w3.org/2000/svg';
const QUIET = 4;
/** Drawn size in px: fits a 360 px screen and does not grow with the text size. */
export const QR_SIZE = 240;

/** The modules of the code for a text, row by row (true is dark); throws when the text is too long. */
export function qrMatrix(text: string): boolean[][] {
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  const n = code.getModuleCount();
  return Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => code.isDark(row, col)),
  );
}

/** The code as an image for assistive technology, labelled `label`. */
export function qrSvg(text: string, label: string): SVGSVGElement {
  const modules = qrMatrix(text);
  const side = modules.length + 2 * QUIET;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'qr-code');
  svg.setAttribute('viewBox', `0 0 ${side} ${side}`);
  svg.setAttribute('width', String(QR_SIZE));
  svg.setAttribute('height', String(QR_SIZE));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = document.createElementNS(SVG, 'rect');
  background.setAttribute('width', String(side));
  background.setAttribute('height', String(side));
  background.setAttribute('fill', '#fff');
  const dark: string[] = [];
  modules.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) dark.push(`M${x + QUIET} ${y + QUIET}h1v1h-1z`);
    }),
  );
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', dark.join(''));
  path.setAttribute('fill', '#000');
  svg.append(background, path);
  return svg;
}
