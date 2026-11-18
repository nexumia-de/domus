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
