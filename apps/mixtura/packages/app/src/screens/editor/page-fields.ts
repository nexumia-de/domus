// The plain fields of the editor: name, template, method, glass, garnish,
// notes, status and the prepared-ingredient part. Typing changes the draft
// without drawing the page again; the choices that change its structure do.

import { h } from '../../dom';
import { strings } from '../../strings';
import { parentChoices } from './ingredient-form';
import { editorStrings as t } from './strings';
import type { Ctx } from './session';
import { setField, setPrepared, setTemplate } from './actions';
import type { EditorVM } from './view-model';

const roleNames = Object.entries(strings.spec.roles);

function field(id: string, label: string, control: HTMLElement, error?: string): HTMLElement {
  return h(
    'div',
    { class: error ? 'field has-error' : 'field' },
    h('label', { for: id }, label),
    control,
    error && h('span', { class: 'field-error', role: 'alert', id: `${id}-error` }, error),
  );
}

function select(
  id: string,
  value: string,
  options: { id: string; name: string }[],
  none: string | null,
  onchange: (value: string) => void,
): HTMLSelectElement {
  const el = h(
    'select',
    {
      class: 'input',
      id,
      name: id,
      'data-focus': id,
      onchange: (event) => onchange((event.target as HTMLSelectElement).value),
    },
    none !== null && h('option', { value: '' }, none),
    ...options.map((o) => h('option', { value: o.id }, o.name)),
  );
  el.value = value;
  return el;
}

export function nameField(ctx: Ctx): HTMLElement {
  return field(
    'name',
    t.name,
    h('input', {
      type: 'text',
      class: 'input',
      id: 'name',
      name: 'name',
      'data-focus': 'name',
      placeholder: t.namePlaceholder,
      autocomplete: 'off',
      autocapitalize: 'words',
      enterkeyhint: 'next',
      value: ctx.session.draft.name,
      oninput: (event) => setField(ctx, 'name', (event.target as HTMLInputElement).value),
    }),
  );
}

export function templateField(ctx: Ctx, vm: EditorVM): HTMLElement {
  return field(
    'template',
    t.template,
    select('template', ctx.session.draft.templateId, vm.templates, t.noTemplate, (id) =>
      setTemplate(ctx, id),
    ),
  );
}

export function detailFields(ctx: Ctx, vm: EditorVM): HTMLElement[] {
  const d = ctx.session.draft;
  const text = (id: 'garnish' | 'notes', area: boolean): HTMLElement => {
    const common = {
      class: area ? 'input input--area' : 'input',
      id,
      name: id,
      'data-focus': id,
      value: d[id],
      oninput: (event: Event) =>
        setField(ctx, id, (event.target as HTMLInputElement | HTMLTextAreaElement).value),
    };
    if (area) {
      const el = h('textarea', { ...common, rows: 3, autocapitalize: 'sentences' });
      el.value = d[id];
      return el;
    }
    return h('input', {
      type: 'text',
      ...common,
      list: 'garnish-list',
      placeholder: t.garnishPlaceholder,
      autocomplete: 'off',
    });
  };
  return [
    field(
      'method',
      t.method,
      select('method', d.method, vm.methods, t.noMethod, (v) => setField(ctx, 'method', v)),
    ),
    field(
      'glass',
      t.glass,
      select('glass', d.glass, vm.glasses, t.noGlass, (v) => setField(ctx, 'glass', v)),
    ),
    field('garnish', t.garnish, text('garnish', false)),
    h('datalist', { id: 'garnish-list' }, ...vm.garnishes.map((g) => h('option', { value: g }))),
    field('notes', t.notes, text('notes', true)),
    field(
      'status',
      t.status,
      select(
        'status',
        d.status,
        Object.entries(t.statusValues).map(([id, name]) => ({ id, name })),
        null,
        (v) => setField(ctx, 'status', v),
      ),
    ),
  ];
}

/** The computed figures of a prepared ingredient; redrawn while typing. */
export function preparedFigures(vm: EditorVM): HTMLElement {
  const p = vm.prepared;
  return h(
    'div',
    { class: 'prepared-figures', 'data-region': 'prepared-figures' },
    h('h3', {}, t.prepared.figures),
    p.figures.length > 0
      ? h(
          'dl',
          { class: 'meta' },
          ...p.figures.flatMap((f) => [h('dt', {}, f.label), h('dd', {}, f.value)]),
        )
      : h('p', { class: 'note' }, t.prepared.noFigure),
    p.reason && h('p', { class: 'note' }, p.reason),
    p.usedIn > 0 && h('p', { class: 'note' }, t.prepared.usedIn(p.usedIn)),
  );
}

export function preparedSection(ctx: Ctx, vm: EditorVM): HTMLElement {
  const p = ctx.session.draft.prepared;
  const toggle = h('input', {
    type: 'checkbox',
    id: 'prepared-toggle',
    'data-focus': 'prepared-toggle',
    ...(p.on && { checked: true }),
    onchange: (event) => setPrepared(ctx, { on: (event.target as HTMLInputElement).checked }, true),
  });
  toggle.checked = p.on;
  const parents = parentChoices(ctx.model.tree).map((c) => ({ id: c.id, name: c.label }));
  return h(
    'section',
    { class: 'card prepared', 'aria-label': t.prepared.toggle },
    h(
      'label',
      { class: 'check-row', for: 'prepared-toggle' },
      toggle,
      h('span', {}, t.prepared.toggle),
    ),
    h('p', { class: 'note' }, t.prepared.hint),
    p.on &&
      h(
        'div',
        { class: 'stack' },
        field(
          'yield',
          t.prepared.yield,
          h('input', {
            type: 'text',
            class: 'input',
            id: 'yield',
            name: 'yield',
            'data-focus': 'yield',
            placeholder: t.prepared.yieldPlaceholder,
            autocomplete: 'off',
            value: p.yieldText,
            'aria-describedby': 'yield-help',
            oninput: (event) =>
              setPrepared(ctx, { yieldText: (event.target as HTMLInputElement).value }),
          }),
          vm.prepared.yieldError,
        ),
        h('span', { class: 'hint', id: 'yield-help' }, t.prepared.yieldHelp),
        field(
          'shelf',
          t.prepared.shelf,
          h('input', {
            type: 'text',
            class: 'input',
            id: 'shelf',
            name: 'shelf',
            inputmode: 'numeric',
            'data-focus': 'shelf',
            placeholder: t.prepared.shelfPlaceholder,
            autocomplete: 'off',
            value: p.shelfText,
            oninput: (event) =>
              setPrepared(ctx, { shelfText: (event.target as HTMLInputElement).value }),
          }),
          vm.prepared.shelfError,
        ),
        field(
          'storage',
          t.prepared.storage,
          h('input', {
            type: 'text',
            class: 'input',
            id: 'storage',
            name: 'storage',
            'data-focus': 'storage',
            placeholder: t.prepared.storagePlaceholder,
            autocomplete: 'off',
            value: p.storageText,
            'aria-describedby': 'storage-help',
            oninput: (event) =>
              setPrepared(ctx, { storageText: (event.target as HTMLInputElement).value }),
          }),
        ),
        h('span', { class: 'hint', id: 'storage-help' }, t.prepared.storageHelp),
        field(
          'pparent',
          t.prepared.parent,
          select('pparent', p.parentId, parents, t.prepared.noParent, (v) =>
            setPrepared(ctx, { parentId: v }),
          ),
        ),
        field(
          'prole',
          t.prepared.role,
          select(
            'prole',
            p.role,
            roleNames.map(([id, name]) => ({ id, name })),
            t.ingredient.roleNone,
            (v) => setPrepared(ctx, { role: v as typeof p.role }),
          ),
        ),
        preparedFigures(vm),
      ),
  );
}
