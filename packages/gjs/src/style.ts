// The colour scheme libadwaita draws: Follow System, Light or Dark.
import Adw from 'gi://Adw?version=1';
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

export type Style = 'system' | 'light' | 'dark';

export function applyStyle(style: Style): void {
  const scheme =
    style === 'light'
      ? Adw.ColorScheme.FORCE_LIGHT
      : style === 'dark'
        ? Adw.ColorScheme.FORCE_DARK
        : Adw.ColorScheme.DEFAULT;
  Adw.StyleManager.get_default().set_color_scheme(scheme);
}

/**
 * The app's whole stylesheet (the toolkit's rules: controls a finger taps are at least
 * 44 px, one `style.css` with colours only from variables). Call once, before a window.
 */
export function addStyle(css: string): void {
  const provider = new Gtk.CssProvider();
  provider.load_from_string(css);
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
}
