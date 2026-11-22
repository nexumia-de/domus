---
type: Specification
title: KitchenOwl sync
description: How a space's list is kept in step with a list on the household's KitchenOwl server - what maps to what, the links, one cycle, several devices, when it runs, setting it up, CORS for the web app, the API calls used, what is lost, and what is not proven.
tags: [kitchenowl, sync, connector, cors, list]
generated: { by: claude-code/2.1.327, at: 2026-11-22 }
sources:
  - id: ko-source
    title: KitchenOwl backend source (AGPL-3.0), shopping list and auth controllers, models, API registration, read 2026-11-22
    url: https://github.com/TomBursch/kitchenowl/tree/main/backend/app
  - id: existing
    title: Existing tools and their gaps (KitchenOwl)
    url: existing-tools.md
---

# KitchenOwl sync

The household used KitchenOwl[^existing] before Emptio. A space can be
connected to one list of a KitchenOwl server; from then on the two lists
are kept in step in both directions, without a person doing anything.
Decided by the owner on 2026-11-22: two-way and continuous, in the web
app and the native Linux app, beside the goals of the
[roadmap](roadmap.md). Code: `packages/app/src/kitchenowl/` (client,
plan, bridge, config), shared by both apps through `@emptio/app/core`.

# What maps to what

| Emptio                                      | KitchenOwl                                                         |
| ------------------------------------------- | ------------------------------------------------------------------ |
| An open entry                               | An item on the list                                                |
| A ticked entry, a removed one               | Not on the list (KitchenOwl's ticking takes it off)                |
| `name`                                      | The item's name; the same thing by the [sort key](engine-rules.md) |
| `amount`                                    | The item's description on that list                                |
| `priority`, `categoryId`, `note`, `origins` | Not sent; they stay in Emptio                                      |

An item that comes from KitchenOwl becomes an entry with priority
_soon_, the category rule 4 gives (what the household gave the same
thing before), origin `typed`, and the id
`kitchenowl-<list>-<item>-<when it was put on the list>`.

# Links

The collection `kitchenowl` of the space (a sealed file like the list)
holds:

- `config`: `{ url, token, householdId, listId, householdName?, listName? }`;
- `item:<KitchenOwl item id>`: `{ entryId, description }`, the entry the
  item is and the description both sides had after the last cycle.

The token is in the space's collection on purpose: every device of the
space keeps the list in step once one person connected it. It is sealed
with the space's key like the list; the storage never sees it. Anyone in
the household can read it, as they can use the KitchenOwl list anyway.
Connecting again (another list) removes the old links; disconnecting
removes the connection and the links, and the list stays.

# One cycle

`planCycle` works it out without doing it; `bridgeCycle` reads the
KitchenOwl list, runs the plan and writes:

1. For each link: the item is gone from KitchenOwl → the entry is
   ticked (if it was open) and the link goes. The entry is ticked or
   gone in Emptio → the item is removed from KitchenOwl. The entry was
   renamed → the old item is removed and the entry is added again under
   its new name. Otherwise the description is compared with the link's:
   the side that changed wins; when both changed, Emptio's amount wins.
2. Each item without a link: an open entry of the same thing gets
   linked (an empty amount takes KitchenOwl's description; otherwise
   Emptio's is sent); else the item is imported as a new entry. If the
   imported id exists already (removed before its link was written), the
   item is removed from KitchenOwl instead.
3. Each open entry without a link is added to KitchenOwl by name with its
   amount; KitchenOwl answers the item id and the link is written.

The requests are sent one by one; on the first failure the rest waits
for the next cycle and what went through is kept. Every write to the
space is one atomic step on the records as stored then: a tick only if
the entry is still open, an amount only if it is still the one the plan
saw, an import only if the id does not exist.

# Several devices

Every device of the space runs the cycle; KitchenOwl's list is the one
place they all see at once. The cycle only gets the space right if it
starts from what the other devices wrote: a device that has not seen a
rename yet finds the old item gone from KitchenOwl, ticks the entry and
imports the new name; its records are the later ones, so they win
whole, and the household ends with "Milk" ticked and "Oat milk" as a
new entry without its priority. Before 2026-11-22 the cycle ran on its
own timer beside the storage's loop and this happened
(`app.test.ts` › 'a rename on one device is not undone by the KitchenOwl
cycle of another' fails on that code).

So a cycle runs only inside a run of the app
([sync](behaviour.md#sync)): storage, then KitchenOwl, then storage, and
not at all when the storage just failed (the status says so: failure
`household`). What remains:

- Two devices that run at the same moment (two people ticking in the
  same few seconds): they import the same putting under the same id,
  add the same name (KitchenOwl keeps an item once per list) and write
  the same links, so the records merge to one. A rename or an edit
  between the storage step of one and the KitchenOwl step of the other
  can still be lost as above; accepted, the window is the few seconds of
  the requests.
- A space on this device only has no storage step; it is the only
  device anyway.

# When

In every run of the app ([sync](behaviour.md#sync)): with _Sync
automatically_ on, at the start, when the page comes to the front or the
connection is back, and two seconds after a change; always when the
person pulls the list down or chooses _Sync now_. No timer. Without a
connection nothing is sent; only the app with a `fetch` option sends
(both apps give one). The status is shown in the settings: "Synced …",
or the last failure in words.

# Setting up

Settings (web) or Preferences (Linux), group KitchenOwl, for the shown
space: the server address, a long-lived token (made in KitchenOwl's
account settings; the exact place in KitchenOwl's app was not checked),
_Check_; then household and list; _Connect_. Disconnect has Undo.

# CORS for the web app

KitchenOwl's backend sends no CORS headers[^ko-source]. The web app runs
on another address than the server, so the browser refuses the answers
unless the household's reverse proxy adds them for `/api/`. With nginx,
for the app at `https://apps.example.org`:

```nginx
location /api/ {
    add_header Access-Control-Allow-Origin "https://apps.example.org" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
    add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
    if ($request_method = OPTIONS) { return 204; }
    proxy_pass http://kitchenowl-backend;
}
```

Without them the app says the server could not be reached and names
CORS. The page's policy allows `https:` only, so the web app reaches a
server on `http://` (a bare LAN address) not at all; the Linux app does
(libsoup, no CORS, no page policy).

# The API

From the backend source[^ko-source], under `<server>/api`, with
`Authorization: Bearer <token>`:

| Call                                       | Use                                                         |
| ------------------------------------------ | ----------------------------------------------------------- |
| `GET /household`                           | Households of the token's user                              |
| `GET /household/<id>/shoppinglist`         | Lists of a household                                        |
| `GET /shoppinglist/<id>/items`             | Items on a list (`id`, `name`, `description`, `created_at`) |
| `POST /shoppinglist/<id>/add-item-by-name` | `{ name, description }`; answers the item                   |
| `POST /shoppinglist/<id>/item/<item id>`   | `{ description }`                                           |
| `DELETE /shoppinglist/<id>/item`           | `{ item_id, removed_at }` (ms); ticking                     |

`/items` is marked deprecated in the source (in favour of the lists
call, which includes them); it is the smaller answer and still served.

# What is lost

- Priority, category and note do not reach KitchenOwl; KitchenOwl's
  categories and icons do not reach Emptio.
- A rename in KitchenOwl renames the item in the whole household there;
  Emptio sees it as the same item and keeps its own name.
- Two entries of the same thing (merged from two devices) are one item
  in KitchenOwl; only the first is linked.

# What is checked and what is not

Checked (`packages/app/test/kitchenowl*.test.ts`, `app.test.ts`, the
browser check `e2e/kitchenowl-scenario.mjs`): against a KitchenOwl in
memory and a fake behind HTTP that follow the source. Since 2026-11-22 the address is read without `URL`, which GJS lacks; the
Linux app had refused every address before (checked in GJS 1.80 with
the bundled function). **Not** checked: a
real KitchenOwl server, a real reverse proxy with CORS, `created_at` as
the real server serialises it, the Linux app against a server (its
preferences were looked at in a screenshot only).

[^ko-source]: KitchenOwl backend source, https://github.com/TomBursch/kitchenowl/tree/main/backend/app

[^existing]: [Existing tools and their gaps](existing-tools.md)
