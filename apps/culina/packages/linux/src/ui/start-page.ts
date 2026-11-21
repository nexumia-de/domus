// The first page: the classics by country, and the way to what the stock allows; the space and
// its sync status are the header's subtitle.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { statusText } from '@nexumia-de/hospes';
import { classics, countryChoices } from '@culina/app/core';
import { barButton, clear, column, titled, type Page, type Ui } from './context';
import { cookablePage } from './cookable-page';
import { countryPage } from './country-page';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function startPage(ui: Ui, menu: any): Page {
  const { session, t, s } = ui;
  const head = titled(t.appName);
  head.header.pack_end(
    new Gtk.MenuButton({
      icon_name: 'open-menu-symbolic',
      menu_model: menu,
      primary: true,
      tooltip_text: t.menu.preferences,
    }),
  );
  const { scrolled, body } = column();
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(barButton(t.start.cookable, true, () => ui.push(cookablePage(ui))));
  view.add_bottom_bar(bar);
  const page = new Adw.NavigationPage({ title: t.appName, tag: 'start', child: view });

  let shown = '';
  function update(): void {
    const state = session.state();
    const space = state.space;
    head.title.set_subtitle(
      space === undefined
        ? ''
        : [
            space.deviceOnly ? '' : space.name,
            statusText(t.status, session.status(), ui.now(), true),
          ]
            .filter((part) => part !== '')
            .join(' · '),
    );
    if (state.phase === 'failed' || state.phase === 'no-content') {
      shown = '';
      clear(body);
      const status = new Adw.StatusPage({
        icon_name: 'dialog-error-symbolic',
        title: state.phase === 'failed' ? t.failure.store : t.failure.content,
        vexpand: true,
      });
      if (state.phase === 'failed') {
        const retry = new Gtk.Button({
          label: t.failure.retry,
          halign: Gtk.Align.CENTER,
          css_classes: ['pill', 'suggested-action'],
        });
        retry.connect('clicked', () => void session.load());
        status.set_child(retry);
      }
      body.append(status);
      return;
    }
    // The list is the same until the content changes; a status change alone does not rebuild it.
    const signature = String(classics().length);
    if (signature === shown) return;
    shown = signature;
    clear(body);
    body.append(new Gtk.Label({ label: s.classics.startTitle, xalign: 0, css_classes: ['title-2'], wrap: true }));
    const group = new Adw.PreferencesGroup({
      title: s.classics.classicsHeading,
    });
    for (const choice of countryChoices(classics())) {
      const row = new Adw.ActionRow({ use_markup: false, activatable: true });
      row.set_title(s.classics.countries[choice.country]);
      row.set_subtitle(t.dishes(choice.count));
      row.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
      row.connect('activated', () => ui.push(countryPage(ui, choice.country)));
      group.add(row);
    }
    body.append(group);
  }
  update();
  return { page, update };
}
