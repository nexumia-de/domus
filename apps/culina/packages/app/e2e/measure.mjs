// Measurements shared by the e2e scripts: horizontal overflow, small targets, the wording scan.

export const FORBIDDEN =
  /\b(wrong|errors?|invalid|incorrect|mistakes?|failed|fail|too much|too little|missing)\b/i;

export const overflow = (page) =>
  page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return {
      scroll: document.documentElement.scrollWidth - w,
      wide: [...document.querySelectorAll('main *')]
        .filter((n) => !n.closest('.sr-only') && n.getBoundingClientRect().right > w + 1)
        .map((n) => n.tagName + '.' + n.className),
    };
  });

/** Words that break in the middle at some place: a word with text rects on more than one line. */
export const brokenWords = (page, selector) =>
  page.evaluate((sel) => {
    const out = [];
    for (const node of document.querySelectorAll(sel)) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        for (const m of t.textContent.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(t, m.index);
          range.setEnd(t, m.index + m[0].length);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          if (lines.size > 1) out.push(m[0]);
        }
      }
    }
    return out;
  }, selector);

export const smallTargets = (page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'a, button, select, input:not([type=radio]), summary, label.choice',
      ),
    ]
      .filter((n) => n.getBoundingClientRect().width > 0 && !n.closest('.sr-only'))
      .map((n) => ({ n, r: n.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ n, r }) => `${n.tagName}.${n.className} ${r.width}x${r.height}`),
  );

/**
 * The texts of the elements whose text runs over more than one line: an amount such as "300 g"
 * that breaks between number and unit. `brokenWords` does not see this, since no word is split.
 */
export const wrappedTexts = (page, selector) =>
  page.evaluate((sel) => {
    const out = [];
    for (const node of document.querySelectorAll(sel)) {
      const text = node.textContent.trim();
      if (text === '') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      if (lines.size > 1) out.push(text);
    }
    return out;
  }, selector);
