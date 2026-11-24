# Log

## 2026-11-24 (after the review)

- **Update**: a recipe origin may carry `dish`, the key of the dish in the app that handed it over ([entry](entry.md)); rule 5 keeps one origin per dish by that key where it is there, else by the title as before ([rules](rules.md#5-twice-the-same)); new vector `add-entry/recipe-origin-by-dish.json`, which fails with the key taken out. Safe for every reader: `isEntryValue` (unchanged since the list was built, 2026-11-20) checks `kind`, `app` and `title` only and lets other fields through; `valueFor` and `addEntry` keep an origin object as it is; Emptio's screens (web and native) show the title; the KitchenOwl bridge writes only typed origins and keeps stored fields; Emptio has no export. An older build that joins two origins of the same title keeps the first one, as before: nothing is dropped or refused. No entry Emptio writes has a `dish`, so Emptio's behaviour does not change (its tests and vectors unchanged).
- **Fix** of the docs: `planAdd` is not the only way entries are written (the KitchenOwl bridge), and `addToList` uses `planAdd`, not `planAdds`.

## 2026-11-24 (creation)

- **Creation**: the package, so that Culina can put what a dish lacks on
  the household's list ([Culina's roadmap, goal 11](../../../apps/culina/docs/roadmap.md))
  without copying Emptio's code: all apps on the address write the
  shared collections directly
  ([decision](../../../docs/decisions/one-origin-spaces-storages.md)).
  Moved from Emptio, unchanged: the entry and its types, the priorities,
  the sort key, `sameThing` and rule 4 (`newEntryCategory`) with the
  usual items and their data file, rule 5 (`addEntry`), the record of the
  collection (`LIST`, `isEntryValue`, `entriesOf`), `valueFor`; the vectors
  of both rules and the priority tests. New: `planAdd`, the pure core of
  Emptio's `addToList`, which Emptio now calls, with two inputs Culina
  needs (`origins`, `catalogue`; Emptio passes neither and gets what it
  got before), `planAdds` for several things in one change, and
  `entryName`. Emptio's tests, vectors and browser checks pass with only
  their imports changed ([Emptio's log](../../../apps/emptio/docs/log.md)).
  The name of the package is provisional.
