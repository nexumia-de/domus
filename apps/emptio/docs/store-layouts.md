---
type: Research
title: Store layouts and the route through a store
description: Whether German stores (Rewe, Aldi, Rossmann) are laid out alike, that no open data on shelf order per store was found, a proposal to learn the route per store from the order of ticking, hiding items a store does not carry, and why the unofficial Rewe client rewerse-engineering is not bound into the app.
tags: [research, stores, layout, categories, rewe, data-sources]
generated: { by: claude-code/2.1.327, at: 2026-11-18 }
sources:
  - id: lp-umbau
    title: 'Lebensmittel Praxis, Ladenumbau: Drei Beispiele'
    url: https://lebensmittelpraxis.de/zentrale-management/15498-ladenumbau-drei-beispiele.html?showall=1
  - id: lp-discounter
    title: 'Lebensmittel Praxis, Discounter: Kampf der Giganten'
    url: https://lebensmittelpraxis.de/zentrale-management/15938-discounter-kampf-der-giganten.html
  - id: osm-indoor
    title: OpenStreetMap wiki, Indoor use cases and Tag amenity=shelf
    url: https://wiki.openstreetmap.org/wiki/Indoor/use_cases
  - id: rewe-list
    title: REWE, help page on the shopping list of the app
    url: https://www.rewe.de/rezepte-ernaehrung/hilfe/rewe-einkaufsliste/
  - id: rewerse
    title: rewerse-engineering, README, docs/readme.md and pkg/readme.md
    url: https://github.com/ByteSizedMarius/rewerse-engineering
---

# Store layouts and the route through a store

Read on 2026-11-18 from web search results and the linked pages. The
owner's idea: "I am at Rewe now", and the list sorts itself along the
way through the store; what the store does not carry is not shown.
First stores: Rewe, Aldi, Rossmann, in Germany.

# Are stores laid out alike

- There is a common pattern, not a fixed order. Fruit, vegetables and
  bakery are usually at the entrance[^lp-umbau].
- Markets of one chain differ and are rebuilt: one Rewe merchant moved
  the tills from the entrance into the drinks department; Aldi Süd's
  new concept took fruit and vegetables away from the tills into a
  "cooking zone"[^lp-umbau][^lp-discounter].
- Nothing was found on Rossmann's layout.
- _Unverified_, from general knowledge and not read at a source: Rewe
  markets are often run by independent merchants and vary most;
  discounters are more uniform within one store generation.

# Sources of layout data

None was found that can be used:

- No open data set links products or categories to aisles of a named
  store. OpenStreetMap can describe indoor shelves (`amenity=shelf`)
  and names aisle addresses as a use case, but the tag describes the
  shelf, not its goods, and supermarkets are hardly mapped
  inside[^osm-indoor].
- REWE's own app fills its list from offers, search and recipes; its
  help page names no sorting by aisle[^rewe-list].
- The unofficial Rewe client has no location data either, see below.

So the order of a store has to come from the household.

# Proposal

1. **A store is an ordered list of categories** (its route) plus the
   categories it carries. Stores belong to the household and sync with
   the list.
2. **A starting route per chain**, curated by us from the common
   pattern and marked as a guess: Rewe (full range), Aldi (discounter),
   Rossmann (drugstore categories and its small food range). No data
   from a third party is needed for this.
3. **The route is learned.** The order in which items are ticked in a
   store shows the order of their categories there. After a trip the
   app adjusts the route of that store, or offers to. Dragging
   categories stays possible.
4. **"I am at"** is chosen by hand. Location is optional at most; it is
   a host API and nothing is sent anywhere.
5. **Hiding.** In a store only items of categories that store carries
   are shown. An item ticked in a store is known to be sold there; "not
   here" on an item hides it for that store and keeps it for the next
   one. A line "n items for other stores" stays visible, so nothing is
   forgotten.

The ordering and hiding rules are pure and belong in the engine with
test vectors; the starting routes are data with their source named.

# The unofficial Rewe client

[rewerse-engineering](https://github.com/ByteSizedMarius/rewerse-engineering)
is an unofficial REWE API client in Go and Python with a CLI, MIT,
supporting app version 5.18.1 as of 2026-09-29[^rewerse].

What it offers: market search, market details, offers, recalls, the
category tree and product search of markets with pickup or delivery,
recipes.

What it does not offer: any place of a product in a store, the range
of a market without pickup or delivery, availability on the shelf.

Why it is not bound into the app:

- It needs the client certificate of the REWE app, which the user
  extracts from the APK. A web app cannot present it, and we cannot
  ship it. Any use would need a program or server next to the app,
  against "no server of ours".
- The API is undocumented and "may change or break at any time"; users
  are told to check the terms of service themselves[^rewerse].
- Every lookup would tell REWE what the household buys.
- It does not answer the question asked here, the route.

If offers are wanted later, the way that fits is a file: the owner runs
the CLI himself and the app imports the result. That is a separate
issue, not part of the first version.

[^lp-umbau]: Lebensmittel Praxis, Ladenumbau: Drei Beispiele, https://lebensmittelpraxis.de/zentrale-management/15498-ladenumbau-drei-beispiele.html?showall=1

[^lp-discounter]: Lebensmittel Praxis, Discounter: Kampf der Giganten, https://lebensmittelpraxis.de/zentrale-management/15938-discounter-kampf-der-giganten.html

[^osm-indoor]: OpenStreetMap wiki, https://wiki.openstreetmap.org/wiki/Indoor/use_cases and https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dshelf

[^rewe-list]: REWE, https://www.rewe.de/rezepte-ernaehrung/hilfe/rewe-einkaufsliste/

[^rewerse]: rewerse-engineering, https://github.com/ByteSizedMarius/rewerse-engineering
