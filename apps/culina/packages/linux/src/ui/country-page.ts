// The dishes of one country, each with its course and whether it has meat or fish.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { classicRows, classics, type ClassicCountry } from '@culina/app/core';
import { column, titled, type Page, type Ui } from './context';
import { dishPage } from './dish-page';

export function countryPage(ui: Ui, country: ClassicCountry): Page {
  const { s } = ui;
  const name = s.classics.countries[country];
  const head = titled(name);
  const { scrolled, body } = column();
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const page = new Adw.NavigationPage({ title: name, tag: `country-${country}`, child: view });
  const rows = classicRows(classics(), country, ui.lang);
  if (rows.length === 0) {
    body.append(new Adw.StatusPage({ title: s.classics.emptyCountry, vexpand: true }));
  } else {
    const group = new Adw.PreferencesGroup({ title: s.classics.listLabel(name) });
    for (const row of rows) {
      const line = new Adw.ActionRow({ use_markup: false, activatable: true });
      line.set_title(row.name);
      line.set_subtitle(
        `${s.classics.course[row.course]} · ${row.vegetarian ? s.classics.withoutMeat : s.classics.withMeat}`,
      );
      line.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
      line.connect('activated', () => ui.push(dishPage(ui, row.id)));
      group.add(line);
    }
    body.append(group);
  }
  return { page, update: () => undefined };
}
