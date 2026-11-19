// The QR code of an invite link, drawn here as an inline <svg> (the page's policy allows no
// inline script and no data: image, and nothing is asked of a web service). Dark modules on
// white with a quiet zone of four modules in both themes: a code has to stay dark on light.
import qrcode from 'qrcode-generator';

const SVG = 'http://www.w3.org/2000/svg';
const QUIET = 4;

/** The modules of the code for a text, row by row (true is dark); throws when it is too long. */
export function qrModules(text: string): boolean[][] {
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => code.isDark(row, column)),
  );
}

/** One path for all dark modules, in the units of the grid with the quiet zone included. */
export function qrPath(modules: boolean[][]): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end += 1;
      parts.push(`M${x + QUIET} ${y + QUIET}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return parts.join('');
}

/** The code as an image for assistive technology, labelled `label`; undefined when too long. */
export function qrImage(text: string, label: string): SVGSVGElement | undefined {
  let modules: boolean[][];
  try {
    modules = qrModules(text);
  } catch {
    return undefined;
  }
  const side = modules.length + 2 * QUIET;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'qr');
  svg.setAttribute('viewBox', `0 0 ${side} ${side}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  svg.setAttribute('shape-rendering', 'crispEdges');
  const background = document.createElementNS(SVG, 'rect');
  background.setAttribute('width', String(side));
  background.setAttribute('height', String(side));
  background.setAttribute('fill', '#fff');
  const dark = document.createElementNS(SVG, 'path');
  dark.setAttribute('d', qrPath(modules));
  dark.setAttribute('fill', '#000');
  svg.append(background, dark);
  return svg;
}
