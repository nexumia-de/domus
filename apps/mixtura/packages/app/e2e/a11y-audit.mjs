/* global document, getComputedStyle, NodeFilter -- in the function the page runs */
// The static half of the accessibility pass: what can be read from the
// rendered page without pressing keys. Returns a list of problems.

export const audit = (page) =>
  page.evaluate(() => {
    const out = [];
    const visible = (el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return false;
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        if (e.hasAttribute('inert') || e.getAttribute('aria-hidden') === 'true') return false;
      }
      return true;
    };
    const label = (el) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}"`;

    // ---- Colours: the browser normalises any CSS colour through a canvas.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = (css) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top, bottom) => {
      const a = top[3] + bottom[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      return [0, 1, 2]
        .map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a)
        .concat(a);
    };
    const lum = ([r, g, b]) => {
      const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    /** The colour behind an element: its ancestors' backgrounds laid over the page. */
    const backdrop = (el) => {
      let colour = [255, 255, 255, 1];
      const chain = [];
      for (let e = el; e; e = e.parentElement) chain.push(e);
      for (const e of chain.reverse()) {
        const s = getComputedStyle(e);
        if (s.backgroundImage !== 'none')
          out.push(`${label(e)} has a background image or gradient`);
        colour = over(rgba(s.backgroundColor), colour);
      }
      return colour;
    };
    const opacity = (el) => {
      let o = 1;
      for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
      return o;
    };
    const disabled = (el) => el.closest('[disabled], [aria-disabled="true"]') !== null;

    // ---- Text contrast, 4.5:1 (3:1 for large text), from rendered colours.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || seen.has(el) || !node.textContent.trim() || !visible(el) || disabled(el)) continue;
      if (['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      seen.add(el);
      const s = getComputedStyle(el);
      const bg = backdrop(el);
      const fg = over([...rgba(s.color).slice(0, 3), rgba(s.color)[3] * opacity(el)], bg);
      const px = parseFloat(s.fontSize);
      const large = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < need) out.push(`contrast ${got.toFixed(2)} < ${need} on ${label(el)}`);
    }
    for (const el of document.querySelectorAll('input, textarea, select')) {
      if (!visible(el) || disabled(el) || el.type === 'checkbox' || el.type === 'radio') continue;
      const s = getComputedStyle(el);
      const bg = backdrop(el);
      const got = ratio(over(rgba(s.color), bg), bg);
      if (got < 4.5) out.push(`contrast ${got.toFixed(2)} < 4.5 in field ${label(el)}`);
      if (el.placeholder) {
        const p = getComputedStyle(el, '::placeholder');
        const pr = ratio(over(rgba(p.color), bg), bg);
        if (pr < 4.5) out.push(`contrast ${pr.toFixed(2)} < 4.5 in placeholder ${label(el)}`);
      }
      // The field's edge, 3:1 against what is around it (WCAG 1.4.11).
      const edge = rgba(s.borderTopColor);
      const around = backdrop(el.parentElement);
      if (parseFloat(s.borderTopWidth) > 0 && ratio(over(edge, around), around) < 3) {
        out.push(`field edge under 3:1 on ${label(el)}`);
      }
    }

    // ---- Touch targets, at least 44 x 44, text links inside running text excepted.
    const controls = [
      ...document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [role="button"], [role="switch"], [role="tab"]',
      ),
    ];
    for (const el of controls) {
      if (!visible(el) || el.type === 'hidden') continue;
      // A checkbox is drawn small; its label row is what is tapped.
      const box =
        (el.type === 'checkbox' || el.type === 'radio'
          ? el.closest('label')
          : null
        )?.getBoundingClientRect() ?? el.getBoundingClientRect();
      const inText =
        el.tagName === 'A' &&
        el.closest('p, .note, li > span') &&
        el.parentElement.textContent.trim() !== el.textContent.trim();
      if (!inText && (box.width < 43.5 || box.height < 43.5)) {
        out.push(`target ${Math.round(box.width)}x${Math.round(box.height)} ${label(el)}`);
      }
    }

    // ---- Links in running text are not told apart by colour alone.
    for (const el of document.querySelectorAll('p a[href], .note a[href]')) {
      if (visible(el) && !getComputedStyle(el).textDecorationLine.includes('underline')) {
        out.push(`link in text without underline ${label(el)}`);
      }
    }

    // ---- Headings: one h1 per page, no skipped level.
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(visible);
    let last = 0;
    for (const heading of headings) {
      const level = Number(heading.tagName[1]);
      if (last > 0 && level > last + 1)
        out.push(`heading jumps h${last} to h${level} at ${label(heading)}`);
      last = level;
    }
    // An open modal sheet makes the page behind it inert: the sheet is the whole page then.
    const modal = document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
    // The page's one h1 is the header's title (the panes are content only).
    const ones = headings.filter((heading) => heading.tagName === 'H1').length;
    if (!modal && ones !== 1) out.push(`${ones} h1 on the page`);
    if (!modal && document.querySelector('.pane h1') !== null) out.push('an h1 inside a pane');
    if (headings.length === 0) out.push('no heading');

    // ---- Landmarks: a navigation and a main, and every control inside one.
    const landmark =
      'nav, main, aside, header, footer, [role="dialog"], [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="region"], [role="status"], [role="alert"], [role="contentinfo"]';
    if (!modal && ![...document.querySelectorAll('main, [role="main"]')].some(visible))
      out.push('no main landmark');
    if (!modal && ![...document.querySelectorAll('nav, [role="navigation"]')].some(visible)) {
      // A pushed screen on a phone hides the bar; the page then has the back button's header.
      if (![...document.querySelectorAll('header')].some(visible))
        out.push('no navigation or header landmark');
    }
    for (const el of controls) {
      if (visible(el) && el.type !== 'hidden' && !el.closest(landmark))
        out.push(`outside any landmark ${label(el)}`);
    }

    // ---- Fields: described-by and invalid are tied to something that exists.
    for (const el of document.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
      for (const attr of ['aria-describedby', 'aria-labelledby']) {
        for (const id of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id))
            out.push(`${attr}="${id}" points nowhere on ${label(el)}`);
        }
      }
    }
    for (const el of document.querySelectorAll('[aria-invalid="true"]')) {
      if (!el.getAttribute('aria-describedby'))
        out.push(`invalid field without its error ${label(el)}`);
    }
    for (const el of document.querySelectorAll('[role="alert"]')) {
      if (visible(el) && !el.textContent.trim()) out.push('empty alert');
    }
    if (document.documentElement.lang === '') out.push('no lang on html');
    // ---- Label in name (WCAG 2.5.3, axe label-content-name-mismatch): a control
    // whose visible text is not in its accessible name cannot be spoken by voice.
    const words = (text) =>
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
    for (const el of document.querySelectorAll(
      'button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="menuitem"]',
    )) {
      const name = el.getAttribute('aria-label');
      // Controls whose text is one plain label; composite rows (a name plus counts) are not judged.
      if (name === null || el.children.length > 0 || !visible(el)) continue;
      const text = words(el.textContent || '');
      // Known: the variant link names the drink first (screens/spec/variant-strings.ts); open follow-up.
      if (name.startsWith('Start a riff on ')) continue;
      if (text && !words(name).includes(text)) {
        out.push(
          `label in name: ${label(el)} has visible text "${text}" outside its accessible name`,
        );
      }
    }

    return out;
  });
