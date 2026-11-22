# The import pack

Dish files in the [classic format](../../../../docs/classic-format.md),
in a folder per country (`de`, `it`, `fr`, `es`), offered to the user
and not shown until taken
([decision](../../../../docs/decisions/bases-and-pack.md)). A base never
lies here; an id lies here or in `../classics/`, never in both. The
build writes these files into `dist/classics-pack.json`.
