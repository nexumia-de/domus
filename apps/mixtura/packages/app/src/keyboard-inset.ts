// Keeps bottom sheets above an on-screen keyboard: where the keyboard covers
// the layout viewport (the visual viewport is shorter), `--kb-inset` is the
// covered height, so a sheet and its fields stay visible
// (docs/behaviour.md, interaction rules).

export function watchKeyboardInset(): void {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const update = (): void => {
    const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    document.documentElement.style.setProperty('--kb-inset', `${Math.round(covered)}px`);
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
}
