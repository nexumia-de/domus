// Cooking one step at a time: the step, the lines it uses with their amounts, its time and
// temperature as the source gives them, the note of a technique the first time it comes, and
// large Back and Next buttons in the bottom bar. The screen stays on while the page is open.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { pickText } from '@culina/engine';
import {
  classics,
  cookView,
  portionsOf,
  setStep,
  stepOf,
  techniques,
  type StepView,
} from '@culina/app/core';
import { clear, column, text, titled, type Page, type Ui } from './context';
import { lineList } from './lines';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function cookPage(ui: Ui, id: string): Page {
  const { t, s } = ui;
  const classic = classics().find((c) => c.id === id);
  const portions = classic ? portionsOf(classic.id) : 1;
  const head = titled(classic ? pickText(classic.name, ui.lang) : id);
  const { scrolled, body } = column();
  const progress = new Gtk.ProgressBar({ margin_start: 12, margin_end: 12, margin_top: 6 });
  const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });
  content.append(progress);
  content.append(scrolled);
  const view = new Adw.ToolbarView({ content });
  view.add_top_bar(head.header);

  // Back and Next stay on the screen: one third and two thirds of the bar, 56 px high.
  const bar = new Gtk.Grid({
    column_homogeneous: true,
    column_spacing: 12,
    css_classes: ['toolbar'],
  });
  const back = new Gtk.Button({ label: s.classics.back, css_classes: ['pill', 'culina-big'] });
  const next = new Gtk.Button({
    label: s.classics.next,
    css_classes: ['pill', 'suggested-action', 'culina-big'],
  });
  bar.attach(back, 0, 0, 1, 1);
  bar.attach(next, 1, 0, 2, 1);
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const page = new Adw.NavigationPage({ title: head.title.get_title(), tag: `cook-${id}`, child: view });

  if (classic === undefined) {
    body.append(new Adw.StatusPage({ title: s.classics.unknownDish, vexpand: true }));
    bar.set_visible(false);
    return { page, update: () => undefined };
  }
  const steps: StepView[] = (() => {
    const made = cookView(classic, portions, ui.lang, ui.nameOf, techniques(), new Set());
    return made.ok ? made.steps : [];
  })();
  const total = steps.length;

  let release: (() => void) | undefined;
  page.connect('showing', () => {
    release ??= ui.keepAwake(classic.id);
  });
  page.connect('hidden', () => {
    release?.();
    release = undefined;
  });

  const go = (to: number): void => {
    setStep(classic.id, Math.max(0, Math.min(total, to)));
    draw();
    scrolled.get_vadjustment().set_value(0);
  };
  back.connect('clicked', () => go(stepOf(classic.id) - 1));
  next.connect('clicked', () => go(stepOf(classic.id) + 1));

  function technique(step: StepView): any {
    const tech = step.technique;
    if (tech === undefined) return null;
    const group = new Adw.PreferencesGroup({ title: s.classics.noteHeading(pickText(tech.name, ui.lang)) });
    const watch = new Adw.ActionRow({ use_markup: false });
    watch.set_title(pickText(tech.watch, ui.lang));
    group.add(watch);
    const more = new Adw.ExpanderRow({ title: s.classics.noteMore, use_markup: false });
    const why = new Adw.ActionRow({ use_markup: false });
    why.set_title(pickText(tech.why, ui.lang));
    more.add_row(why);
    for (const source of tech.sources) {
      const row = new Adw.ActionRow({ use_markup: false });
      const line = s.classics.noteSource(s.classics.noteLevel[source.level ?? tech.level], source.title, source.place);
      row.set_title(source.isbn === undefined ? line : s.classics.noteSourceBook(line, source.isbn));
      more.add_row(row);
    }
    group.add(more);
    return group;
  }

  function draw(): void {
    clear(body);
    const at = Math.min(stepOf(classic!.id), total);
    progress.set_fraction(total === 0 ? 0 : at / total);
    back.set_sensitive(at > 0);
    next.set_visible(at < total);
    next.set_label(at === total - 1 ? s.classics.finish : s.classics.next);
    if (at >= total) {
      head.title.set_subtitle(t.cook.done);
      body.append(
        new Adw.StatusPage({
          icon_name: 'emblem-ok-symbolic',
          title: s.classics.doneHeading,
          description: total === 0 ? s.classics.noSteps : null,
          vexpand: true,
        }),
      );
      return;
    }
    const step = steps[at] as StepView;
    head.title.set_subtitle(t.cook.stepOf(step.number, total));
    body.append(text(s.classics.stepHeading(step.number, total), 'title-2'));
    body.append(text(s.classics.stepFrom(step.component), 'dim-label'));
    body.append(text(step.text, 'title-4'));
    const facts = [
      step.time === undefined ? undefined : s.classics.timeLabel(step.time),
      step.temperature === undefined ? undefined : s.classics.temperatureLabel(step.temperature),
    ].filter((fact): fact is string => fact !== undefined);
    if (facts.length > 0) body.append(text(facts.join(' · '), 'heading'));
    if (step.lines.length > 0) {
      const uses = new Adw.PreferencesGroup({ title: s.classics.usesHeading });
      uses.add(lineList(ui, step.lines));
      body.append(uses);
    }
    if (step.note) {
      const note = technique(step);
      if (note !== null) body.append(note);
    }
  }
  // Cooking starts at the first step, as on the web.
  setStep(classic.id, 0);
  draw();
  return { page, update: () => undefined };
}
