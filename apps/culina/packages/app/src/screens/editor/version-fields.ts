// The optional fields next to Save: what changed, why, and a tasting note for the version Save
// adds; a new record is asked for the tasting note only. They are part of the form, so they are kept in the draft with everything else.
import type { VersionNote } from '../../editor/version-save';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { areaField, textField } from './form-bits';

const t = strings.versions;

export const versionFields = (
  form: { versionNote?: VersionNote },
  changed: () => void,
  isNew = false,
): HTMLElement => {
  const note = (form.versionNote ??= {});
  const section = el('section', 'version-fields');
  const change = textField(t.changeLabel, note.change ?? '');
  const reason = textField(t.reasonLabel, note.reason ?? '');
  const tasting = areaField(t.tastingLabel, note.tasting ?? '');
  change.control.addEventListener('input', () => {
    note.change = change.control.value;
    changed();
  });
  reason.control.addEventListener('input', () => {
    note.reason = reason.control.value;
    changed();
  });
  tasting.control.addEventListener('input', () => {
    note.tasting = tasting.control.value;
    changed();
  });
  // A first version has nothing it changed and no reason for a change: only the tasting note.
  section.append(
    el('h2', undefined, t.sectionHeading),
    ...(isNew ? [] : [el('p', 'muted', t.optionalHint), change.wrap, reason.wrap]),
    tasting.wrap,
  );
  return section;
};
