// Runs from index.html before first paint (a blocking script in <head>),
// so the saved theme is set before anything is drawn and there is no
// flash of the wrong theme. A file of its own, because the page's
// Content-Security-Policy allows no inline script.

try {
  const saved = JSON.parse(
    localStorage.getItem('mixtura.prefs-copy') || localStorage.getItem('mixtura.prefs') || '{}',
  ) as { theme?: unknown };
  const theme = saved.theme;
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch {
  // No storage or no saved choice: the system theme applies.
}
