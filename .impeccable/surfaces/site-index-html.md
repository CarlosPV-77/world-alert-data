---
version: 1
slug: "site-index-html"
primary_target: "site/index.html"
related_targets: []
---

# World Alert map console

Scope: the whole web app (site/index.html). Visitor mode: Operate. Audience: Carlos, alone, mostly desktop, also phone and tablet. Job: turn on topics and countries, see what is happening, how serious, how trustworthy. Constraints: everything free, Spanish UI, layers start off, no real police insignia, names or logos.

## Direction contract

THESIS: World Alert as an emergency operations room console in the spirit of a Spanish 091/110 sala: the map is the video wall and the side panel is a dispatch queue ordered by priority. It refuses the generic dark dashboard of rounded cards with one neon accent.

OWN-WORLD: room-dark blue-black ground (#05080c), steel-blue console panels, a committed dispatch-blue header rail, severity as priority codes P1 red, P2 orange, P3 amber, P4 blue, with official green only for trust. Saira Semi Condensed uppercase for signage, Public Sans for reading, B612 Mono for clocks, timers and coordinates. Square corners, 1px rules, dense rows.

STORY: Carlos opens the console, switches on what he wants, reads the queue top-down by priority and elapsed time, and jumps to the map. Incoming incidents arrive in a tab at the top of the wall.

FIRST VIEWPORT: blue header rail with brand, two wall clocks (Madrid, UTC, seconds) and source status; map wall left; right column with countries, layers, filters, the priority tally and the incident queue. Primary action: layer switches.

FORM: pinned by the user (sala del 091/110), no roll. seed: none (unavailable)

Signature move: the dispatch queue row: a priority block (P1..P4) in severity colour, category, and an elapsed timer T+hh:mm that keeps counting.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
