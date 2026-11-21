// The ingredient lines of a dish or a step as one boxed list. A line with an amount shows it in
// bold in a column of its own, as wide as the longest amount of the list (a size group). A line
// without an amount keeps an empty amount cell, so all names stand in one column; the web app
// shows such a line as its name alone from the left edge (docs/native-linux.md#the-ingredient-list).
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { LineView } from '@culina/app/core';
import type { Ui } from './context';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function lineList(ui: Ui, lines: readonly LineView[]): any {
  const list = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.NONE,
    css_classes: ['boxed-list'],
  });
  const amounts = new Gtk.SizeGroup({ mode: Gtk.SizeGroupMode.HORIZONTAL });
  for (const line of lines) {
    // Markup is switched off: a name or a note may hold "&" or "<".
    const row = new Adw.ActionRow({ use_markup: false, css_classes: ['culina-target'] });
    row.set_title(line.name);
    const notes = [
      line.note,
      line.optional ? ui.s.classics.optional : undefined,
      line.settled ? ui.s.classics.settledMark : undefined,
    ].filter((note): note is string => note !== undefined);
    if (notes.length > 0) row.set_subtitle(notes.join(' · '));
    // A line without an amount keeps an empty cell, so every name stands in one column.
    const label = new Gtk.Label({
      label: line.amount ?? line.amountWord ?? '',
      wrap: true,
      width_chars: 8,
      max_width_chars: 16,
      xalign: 0,
      valign: Gtk.Align.CENTER,
      use_markup: false,
      css_classes: ['heading'],
    });
    amounts.add_widget(label);
    row.add_prefix(label);
    list.append(row);
  }
  return list;
}
