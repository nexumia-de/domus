---
type: Decision Record
title: One Cook screen, three destinations
description: Decided by the owner on 2026-11-22 (issue 44 of suitably/domus). Start and the separate finder screen go; Cook is one screen, the one dish list with the one filter, a switch "Only with what I have" judged by the finder, "Use up first" as an order of that list, and the stock one tap away; the navigation has Cook, Notebook and Ratios; the Notebook holds own and shipped components and dishes for editing and building on, each part a plain list; the old addresses keep working as redirects; what the agent chose where the owner's text left room.
tags: [decision, navigation, cook, finder, dishes, stock]
generated: { by: claude-code, at: 2026-11-22 }
sources:
  - id: issue
    title: 'Issue 44 of suitably/domus, as decided by the owner on 2026-11-22'
  - id: list
    title: 'Decision: one list of dishes, whatever their origin'
    url: one-dish-list.md
  - id: book
    title: 'Decision: your own recipe book and a finder from what is there'
    url: recipe-book.md
  - id: scope
    title: 'Decision: Culina is a recipe app'
    url: scope-recipe-app.md
---

# One Cook screen, three destinations

**Status: decided by the owner on 2026-11-22** in issue 44 of
suitably/domus. The three numbered points under "Decision" are the
owner's; the points under "Agent's choices" were left open by the owner's
text and are the agent's, for the owner's review. What is built is in
[behaviour](../behaviour.md#cook) and the [log](../log.md).

## Context

After the [one dish list](one-dish-list.md) the app asked "what do I cook"
in three places. **Start** (`#/start`) showed the one list of every dish
under the one filter, then a list of the tools. **Cook** (`#/cook`) was the
finder, "What can I cook": the same dishes, ranked by what the stock allows,
with its own two choices (how much may lack, a role), components and ratio
cards in a second group, and two more views at the top, **Use up first**
(`#/cook/use-up`, the stock items with a use-by date and what uses each)
and **What is there** (`#/stock`). The **Notebook's Dishes** showed the one
list a third time. The navigation had four entries: Start, Cook, Notebook,
Ratios.

The same dishes under the same filter on three screens, each with a
different second question, made the user choose a screen before asking the
question.

## Decision

1. **One screen, "Cook"** (German "Kochen"): the one dish list with the one
   filter; a switch **"Only with what I have"**, which shows only the dishes,
   own and shipped, that the stock covers, using the finder's existing
   judgement (the engine's `makeable` and `classicsMakeable`, as
   `src/dishes/ready-now.ts` asks it for the random pick); **"Use up first"**
   as a sort order of that list; the stock reachable from there. Start and
   the separate Cook screen go.
2. **The navigation has three entries**: Cook, Notebook, Ratios. Settings
   stays the gear (the last entry of the rail on a desktop).
3. **The Notebook** holds the own and shipped components and dishes, for
   editing and building on. Its Dishes part is no second browse list.

## Agent's choices

Each is the agent's choice, for the owner's review.

- **The switch asks for complete dishes.** "The stock covers" is read as
  the finder's threshold 0: every required line there, as `readyNowKeys`
  asks it. The finder's own choices "lacking at most 1, 2, 3" and "covers
  the role" are not on Cook.
- **"Use up first" places every dish that uses a dated item**, whether or
  not every line is there: the finder is asked at its wide threshold, and
  the dishes with an urgency come first in the engine's one ranking
  (`rankCandidates`: the nearest use-by first, then roles covered, then
  name); the rest follow by name. With "Only with what I have" both apply.
  The row says which item sets its place ("uses the Leek with 1 day left"),
  the words the finder used for its reason, and, for a dish that lacks
  lines and so can stand above a complete one, how many ("lacks 2",
  German "noch 2 nötig"; added after the review of 2026-11-22). When the
  finder cannot read the notebook (a broken ingredient tree), the order
  places nothing and the list says nothing about dates.
- **Both choices are kept on the device** under `culina.cookList`, like the
  dish filter under `culina.dishes`. "Show all", where nothing fits, also
  lets go of "Only with what I have"; the order stays.
- **The stock stays its own screen** (`#/stock`, `#/stock/add`,
  `#/stock/<id>/edit`, under Cook in the navigation), reached by "What is
  there" beside Cook's title, with "Back to Cook" on the stock list; `#/stock`
  is no redirect. It is not folded into Cook, so that adding and editing
  items keep their addresses and screens. **For the owner's review.**
- **The old `#/cook` sets no filter.** `#/cook` was the finder's address
  and is now Cook's own address, the one the navigation entry opens. It
  does not turn "Only with what I have" on, although the old finder only
  showed what the stock allows: as the navigation's address it is opened by
  every tap on Cook, so turning the switch on there would turn it on with
  every tap and take away the user's choice. **For the owner's review.**
- **"Start from one ingredient" stays** as a closed section under Cook's
  list, and `#/cook/<id>/with` ("What uses <ingredient>") stays the
  finder's screen for one ingredient, with its ranking, its reasons and its
  two choices. It is the only place where components and ratio cards are
  still ranked by what the stock allows.
- **The old addresses are redirects**, each without a new history entry:
  `#/start` is no route any more and opens the default route, Cook (as any
  unknown address does); `#/cook/use-up` keeps the order "Use up first" and
  is replaced by `#/cook`; `#/classics` and `#/classics/<country>` set their
  filter and are replaced by `#/cook` (before, `#/dishes`). An address
  from outside may change a kept choice; a link inside the app never does.
- **The Notebook's Dishes are own and shipped dishes in a plain list**,
  like Components: the own dishes under "In my notebook", the shipped ones
  by name under "Shipped with the app", each shipped row marked "Shipped"
  and opening the shipped dish's screen (read-only, with "Keep in my
  notebook"); the search by name, the select "From" (All, Mine, Shipped),
  "Add a dish" and "Put a dish together at random". No dish filter, no
  "Only with what I have", no "Use up first": those are Cook's. The reason
  is the owner's own text of point 3: "Notebook = own and shipped
  components and dishes, for editing and building on. Its Dishes part is
  no second browse list." A first version of this change listed the own
  dishes only, reading "no second browse list" as "no shipped dishes"; the
  owner's text names shipped dishes in the Notebook, so the list holds
  them, and "no second browse list" is met by leaving out what makes Cook a
  browse list (the filter, the switch, the order). The same list pane
  serves Components, which lists the shipped components the same way.
- **The dish screens stay under the Notebook** in the navigation, own and
  shipped, as before; the way back from a dish opened on Cook is Cook.

## Rejected

- **Keeping the finder's ranked list as a mode of Cook.** It would be the
  second logic the decision removes: one list ordered by name or by use-by,
  and one by the finder's ranking. Its words for why a dish is where it is
  live on in "What uses <ingredient>".
- **"Use up first" as a list of stock items.** The owner made it an order
  of the dish list; the stock list itself is ordered by use-by already.

## Consequences

- The [one dish list](one-dish-list.md) stands; its "lists and start
  screen" are now Cook's one list. A dated note there points here.
- "Lacking at most" no longer narrows a list of dishes in the web app; the
  native Linux app keeps its own finder page (not part of this decision).
- **Not verified:** the switch and the order on a real device, with the 48
  real shipped dishes compared against the engine (the browser check uses
  fictional dishes; the real ones were only looked at in a screenshot), and
  a screen reader on the switch and the order.
