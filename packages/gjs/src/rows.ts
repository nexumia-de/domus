// Text fields in a list that scrolls by touch. GTK's text widget and libadwaita's entry row take
// the keyboard focus the moment a finger touches them (gtk/gtktext.c, the click gesture's
// "pressed": gtk_widget_grab_focus, then the sequence is claimed; libadwaita
// src/adw-entry-row.c, pressed_cb: gtk_text_grab_focus_without_selecting). A drag that starts on
// a field therefore focuses it before the scrolled window can tell the drag from a tap: on a
// phone the on-screen keyboard comes up, the window shrinks, and the list is scrolled back to the
// field. The owner could not scroll such a list on Phosh
// (docs/platform.md#text-fields-in-a-scrolling-list).
//
// `editOnTap` changes this for touch only: a field takes the focus on a tap, on the release of
// a touch that did not become a scroll. Once it has the focus, it behaves as GTK's own (the
// cursor follows a tap, a drag selects). A mouse or a pen keeps GTK's own behaviour throughout
// (a click puts the cursor where it is, a press and drag selects, the context menu), and the
// keyboard (Tab) reaches the field as before.
import Gdk from 'gi://Gdk?version=4.0';
import Gtk from 'gi://Gtk?version=4.0';

/* eslint-disable @typescript-eslint/no-explicit-any */
const each = (widget: any, run: (child: any) => void): void => {
  for (let child = widget.get_first_child(); child !== null; child = child.get_next_sibling()) {
    run(child);
    each(child, run);
  }
};

/** Whether `widget` or a parent up to `row` is a control of its own (a button, a switch). */
const inControl = (widget: any, row: any): boolean => {
  for (let at = widget; at !== null && at !== row; at = at.get_parent()) {
    if (at instanceof Gtk.Button || at instanceof Gtk.Switch || at instanceof Gtk.CheckButton) {
      return true;
    }
  }
  return false;
};

/**
 * An `AdwEntryRow` (or `AdwPasswordEntryRow`) that a touch focuses on a tap, never on the touch
 * that starts a scroll; a mouse and a pen work as GTK's own. Call it once, right after the row
 * is made.
 */
export function editOnTap<T>(row: T): T {
  const widget = row as any;
  const texts: any[] = [];
  each(widget, (child) => {
    if (child instanceof Gtk.Text) texts.push(child);
  });
  // The row's own click gesture focuses the field on the press, as GtkText does.
  const own: any[] = [];
  const controllers = widget.observe_controllers();
  for (let i = 0; i < controllers.get_n_items(); i++) {
    const controller = controllers.get_item(i);
    if (controller instanceof Gtk.GestureClick) {
      own.push([controller, controller.get_propagation_phase()]);
    }
  }
  // Before any widget of the row sees a press, it is known whether a finger made it: for a
  // touch, both focus-on-press handlers are switched off (unfocused, GtkText's press handler
  // then returns before it focuses or claims the touch); for a mouse or a pen they are on.
  let touch = false;
  const look = new Gtk.EventControllerLegacy({ propagation_phase: Gtk.PropagationPhase.CAPTURE });
  look.connect('event', (_controller: unknown, event: any) => {
    const type = event.get_event_type();
    if (type !== Gdk.EventType.TOUCH_BEGIN && type !== Gdk.EventType.BUTTON_PRESS) return false;
    touch = type === Gdk.EventType.TOUCH_BEGIN;
    for (const text of texts) text.set_focus_on_click(!touch);
    for (const [controller, phase] of own) {
      controller.set_propagation_phase(touch ? Gtk.PropagationPhase.NONE : phase);
    }
    return false;
  });
  widget.add_controller(look);
  // A tap focuses the field. A drag beyond the threshold is claimed by the scrolled window,
  // which cancels this gesture, so no "released" follows.
  const tap = new Gtk.GestureClick();
  tap.connect('released', (_gesture: unknown, _presses: number, x: number, y: number) => {
    if (!touch || texts.length === 0 || texts.some((text) => text.has_focus)) return;
    const picked = widget.pick(x, y, Gtk.PickFlags.DEFAULT);
    if (picked !== null && inControl(picked, widget)) return;
    widget.grab_focus_without_selecting();
    widget.set_position(-1);
  });
  widget.add_controller(tap);
  return row;
}
