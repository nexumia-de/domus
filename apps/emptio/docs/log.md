# Log

## 2026-11-18

- **Decision**: by the owner: Rewe offers come through a connector the household hosts; an entry on offer is shown as _now_ in that store where this is switched on, in [how Emptio is built](architecture.md#rules-of-the-engine) (rule 8), [store layouts](store-layouts.md#the-unofficial-rewe-client) and the [roadmap](roadmap.md) (goal 6). Goals are issues 1 to 6 with sub-issues 7 to 18.
- **Decision**: by the owner, in [how Emptio is built](architecture.md#decisions): shared host code in a second package hospes, the ingredient catalogue in a data package of its own, the list inside the place, priority in three steps, amounts as free text, planning with issues and sub-issues instead of milestones.
- **Creation**: [roadmap](roadmap.md) and [how Emptio is built](architecture.md): the plan of the app, with five decisions open for the owner (shared host code, home of the ingredient catalogue, list inside the place, priority steps, amounts).
- **Decision**: by the owner, in [store layouts](store-layouts.md#proposal): a new store always starts with the default route of its chain and the user moves categories from there; a hand-made order is never overwritten.
- **Creation**: [store layouts](store-layouts.md): layouts of Rewe, Aldi and Rossmann differ per market, no open data on shelf order was found, proposal of a route per store (starting route per chain, learned from the order of ticking, hiding what a store does not carry), and the reasons not to bind in rewerse-engineering.
- **Creation**: [existing tools and their gaps](existing-tools.md): the owner's requirements for a household shopping list (priority, categories, offline first, no server, hand-over with Culina and Mixtura), 27 tools read at their repositories and store pages, eight gaps, and the hosts that were blocked. Names by the owner: repository Emptio with the visible name Shopping List, umbrella Domus with the visible name Household.
