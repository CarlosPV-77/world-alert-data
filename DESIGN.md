---
name: World Alert
description: Personal real-time world alert map, built as an emergency operations room console.
colors:
  room: "#05080c"
  wall: "#070c12"
  panel: "#0b121a"
  panel-2: "#101a25"
  panel-3: "#16222f"
  line: "#1c2938"
  line-2: "#2b3b4e"
  fg: "#e3ebf2"
  muted: "#8d9eb0"
  rail: "#0a2a52"
  rail-line: "#1d4d8a"
  rail-fg: "#f2f6fb"
  rail-muted: "#a9bfdb"
  accent: "#49b3ff"
  accent-ink: "#03111f"
  p4-baja: "#4aa3e0"
  p3-media: "#f0c419"
  p2-alta: "#ff7b1c"
  p1-critica: "#ff4040"
  ok: "#36d27f"
  disputed: "#d6a24a"
  night: "#01060b"
  sun: "#f3c94b"
  ink: "#05080c"
  ship-cargo: "#a9b8c6"
  ship-tanker: "#b48cff"
  ship-people: "#ff8ad8"
  ship-fishing: "#7fd6cf"
  ship-service: "#f2f6fb"
  ship-other: "#6f7d8a"
typography:
  display:
    fontFamily: "Saira Semi Condensed, Arial Narrow, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  headline:
    fontFamily: "Saira Semi Condensed, Arial Narrow, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.12
  title:
    fontFamily: "Saira Semi Condensed, Arial Narrow, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.06em"
  label:
    fontFamily: "Saira Semi Condensed, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.16em"
  priority:
    fontFamily: "Saira Semi Condensed, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.04em"
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.35
  body-reading:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  data-clock:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    letterSpacing: "0.04em"
    fontFeature: "tnum"
  data:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  square: "2px"
  none: "0px"
spacing:
  hair: "2px"
  tight: "6px"
  base: "12px"
  gutter: "16px"
components:
  button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.fg}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "6px 12px"
  button-hover:
    backgroundColor: "{colors.panel-3}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "6px 12px"
  header-rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-fg}"
    padding: "8px 16px"
  wall-clock:
    textColor: "{colors.rail-fg}"
    typography: "{typography.data-clock}"
    padding: "3px 10px"
  input:
    backgroundColor: "{colors.room}"
    textColor: "{colors.fg}"
    rounded: "{rounded.square}"
    padding: "7px 9px"
  priority-block:
    textColor: "{colors.ink}"
    typography: "{typography.priority}"
    height: "26px"
    width: "38px"
  queue-row:
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    padding: "9px 14px 9px 12px"
  queue-row-hover:
    backgroundColor: "{colors.panel-2}"
  queue-row-selected:
    backgroundColor: "{colors.panel-3}"
  incoming-tab:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.fg}"
    padding: "7px 14px 8px"
  priority-tally:
    backgroundColor: "{colors.room}"
    textColor: "{colors.fg}"
    padding: "8px 4px 7px"
  country-chip:
    textColor: "{colors.fg}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "2px 3px 2px 8px"
  layer-switch:
    backgroundColor: "{colors.room}"
    width: "30px"
    height: "16px"
---

# Design System: World Alert

## Overview

**Creative North Star: "The Operations Room"**

World Alert is drawn as the emergency operations room of a Spanish 091/110 sala. The map is the video wall, the dark room around it holds everything else, a committed dispatch-blue rail runs across the top carrying the brand, two wall clocks and the source status, and the right column is the dispatch queue where every row carries its priority. The room is quiet and dark so that colour means something: severity colour belongs to incidents, and almost nothing else is allowed to be loud.

Density is high and deliberate. Rows are tight, separated by 1px rules rather than gaps or cards; corners are square; signage is condensed uppercase; anything that counts, ticks or locates is set in a monospaced data face with tabular figures. The system rejects the generic dark dashboard of rounded cards with one neon accent, and it carries no real police insignia, names or logos; the reference is the room, not the institution.

**Key Characteristics:**
- Room-dark blue-black ground with stepped steel-blue panels; depth by tone, not by cards.
- A solid dispatch-blue header rail is the one large area of colour outside the map.
- Severity is expressed as priority codes P1 to P4, each with its own colour and always with its code in text.
- Three type voices with fixed jobs: Saira Semi Condensed for signage, Public Sans for reading, Azeret Mono for data.
- Square 2px corners, 1px rules, dense rows, 44px touch targets on coarse pointers.

## Colors

A near-black blue room with steel panels, one dispatch-blue rail, one interface blue, and a four-step priority scale that owns all the warm colour.

### Primary
- **Dispatch Rail Blue** (rail): the header rail background and the safe-area strip above it. Its border is **Rail Line Blue** (rail-line); text on it is **Rail White** (rail-fg) and **Rail Haze** (rail-muted) for clock captions and source status.
- **Console Signal Blue** (accent): the interface accent. Focus outline, primary button fill, selected queue row outline, active layer switch, chosen countries on the map, links, the saved marker. Text on its fill is **Signal Ink** (accent-ink).

### Secondary: the priority scale
- **P1 Crítica Red** (p1-critica, `--s4`): critical incidents; also the pulsing ring on critical map markers.
- **P2 Alta Orange** (p2-alta, `--s3`): high severity; also reused for the unverified seal and the "Sin verificar" badge, and for source errors.
- **P3 Media Amber** (p3-media, `--s2`): medium severity; AEMET yellow zones.
- **P4 Baja Blue** (p4-baja, `--s1`): low severity.

The scale is applied through a local `--sev` custom property set per row, tab or marker, so one component recolours itself by priority.

### Tertiary
- **Official Green** (ok): reserved for trust. The verified seal, the "verified" badge, and the live dot in the brand. Nothing decorative is green.
- **Disputed Ochre** (disputed): disputed territory fill, dashed outline and legend hatch.
- **Night** (night) and **Sun** (sun): the day/night overlay and sun marker only.

### Neutral
- **Room** (room): page ground, input and select wells, the priority tally strip, the off state of switches.
- **Wall** (wall): the map wall behind tiles (also the map background layer).
- **Panel, Panel 2, Panel 3** (panel, panel-2, panel-3): three steps of console steel. Panel is the side column and floating sheets; Panel 2 is button fill, layer groups, row hover and the detail block; Panel 3 is hover on buttons and the selected row.
- **Rule and Rule Strong** (line, line-2): 1px dividers between rows and sections, and borders on controls and floating elements.
- **Console White** (fg) and **Steel Muted** (muted): primary and secondary text.
- **Ink** (ink): text set on priority colour fills.

### Named Rules
**The Priority Owns The Heat Rule.** Red, orange and amber are priority colours. They appear only where an incident's severity is being stated (or, for P2 orange, where something is unverified or failing). No decorative use.

**The Green Means Trusted Rule.** Official Green marks verified, official or live. Never use it for success toasts, active states or decoration.

**The Code Beside The Colour Rule.** Every severity colour is accompanied by its code (P1 to P4) or its Spanish word (Crítica, Alta, Media, Baja). Colour alone never carries severity.

## Typography

**Signage Font:** Saira Semi Condensed (with Arial Narrow, sans-serif), weights 500 to 700
**Reading Font:** Public Sans (with system-ui, sans-serif), weights 400 to 600
**Data Font:** Azeret Mono (with ui-monospace, monospace), weights 400 to 600

**Character:** Condensed uppercase signage reads like the labels on a console and the boards on a room wall; Public Sans keeps headlines from the press readable at small sizes; Azeret Mono gives clocks, timers, counts and coordinates a steady rhythm. B612 Mono was tried and rejected because its wide colon broke the clock rhythm.

### Hierarchy
- **Display** (Saira 700, 21px, line-height 1, 0.14em, uppercase): the brand on the rail only. 18px under 760px; tracking drops to 0.08em under 1100px.
- **Headline** (Saira 600, 21 to 22px, line-height 1.12 to 1.15, balanced wrap): incident titles in the detail block and the incoming-tab sheet; the settings title is set uppercase with 0.12em tracking.
- **Title** (Saira 600, 13px, 0.06 to 0.08em, uppercase): buttons, layer group names, country chips (12px), queue row category (11px, 0.1em).
- **Label** (Saira 600, 12px, 0.16em, uppercase, muted): section signage ("Países", "Capas") followed by a 1px rule that runs to the edge. Clock captions use the same voice at 11px.
- **Priority** (Saira 700, 14px, 0.04em): the P1 to P4 code inside the priority block; 11px in the tally and legend.
- **Body** (Public Sans 400/500, 14px, line-height 1.35): queue titles at 500, general UI text at 400.
- **Body Reading** (Public Sans 400, 13px, line-height 1.5, muted): incident descriptions and settings hints.
- **Data Clock** (Azeret Mono 400, 16px, 0.04em, tabular figures): the wall clocks; 14px under 760px.
- **Data** (Azeret Mono 400, 11 to 12px, tabular figures): elapsed timers, counts, tally numbers (20px), detail values, source status, pager.

### Named Rules
**The Three Voices Rule.** Signage is Saira uppercase, reading is Public Sans in sentence case, anything that counts, ticks or locates is Azeret Mono with tabular figures. Do not swap jobs between faces.

**The Steady Clock Rule.** Every number that updates in place (clocks, T+ timers, counts) uses `font-variant-numeric: tabular-nums` so nothing jitters as it ticks.

## Layout

The app is a full-height grid: the header rail on top, then the map wall (flexible) beside a side column of 320 to 380px. The side column stacks filters (countries, layers, period and minimum severity), then the detail block, the priority tally and saved bar, then the scrolling incident queue. The map and the queue scroll independently; the page itself does not scroll on desktop.

Side gutters are 16px, widened to the safe-area inset where larger. Map overlays sit 10 to 12px from the wall edges, each in its own place: the incoming-incident dock hangs from the top centre (up to 580px wide), the view switch and the imagery date stack at the top left, the legend sits bottom left and the zoom stack bottom right. When the wall is too narrow for the dock and the top-left stack side by side, the stack (and the country labels of split views) steps down below the dock. Country maps carry their label top left with their imagery date under it. Split views hide the legend.

Spacing rhythm is small and tight: 2px between stacked clocks and zoom buttons, 6px between buttons and chips, 10 to 12px inside rows and sections, 16px for the column gutter.

**Responsive.** At 1100px and below, long button labels drop and the brand tightens. At 900px and below (phones and portrait tablets), the map wall takes 58vh above the column (82vh in split views, whose maps then stack), the page scrolls, and the queue lists in full. At 760px and below, the rail also becomes a grid (brand and actions on row one, the two clocks sharing row two, status on row three, single line with ellipsis).

### Named Rules
**The Rule Not Gap Rule.** Sections and rows are separated by 1px rules (line), not by whitespace or by cards. Dense lists stay dense.

## Elevation & Depth

Depth is tonal. The room, wall and three panel steps make the structure; 1px rules separate parts. Shadows appear only on things that float over the map wall or over other content, and they are soft, dark and ambient.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 6px 18px rgba(0,0,0,.5)`): map tooltip.
- **Dropdown** (`box-shadow: 0 8px 24px rgba(0,0,0,.5)`): country search options.
- **Tab** (`box-shadow: 0 10px 26px rgba(0,0,0,.55)`): the folded incoming-incident tab.
- **Sheet** (`box-shadow: 0 16px 40px rgba(0,0,0,.6)`): the unfolded incoming-incident sheet.
- **Selected row** (`box-shadow: inset 0 0 0 1px` accent): an outline drawn inside, not a lift.

### Named Rules
**The Flat Console Rule.** Panels in the side column never cast shadows. Only floating overlays on the wall do.

## Shapes

Corners are square: 2px (`--r`) on buttons, inputs, selects, chips, layer groups, legend, tooltip and zoom buttons; 0 on full-width sheets (settings, unfolded incoming sheet) and on priority blocks, tally cells, clocks and switches. Severity is drawn as heavy edge bars: a 3px bottom border in priority colour on the incoming tab, a 3px top border on the unfolded sheet, a 3px accent top border on the settings sheet. Switches are square tracks with a square knob. Unverified items use dashed borders (priority block, badge, map marker outline) so trust reads by shape as well as colour. Events are drawn as pictograms of what happened (seismic trace, volcano, wave, cyclone, flood, flame, cracked ground, storm, rain, wind, snow, heat, cold, fog, coastal waves, tornado, ship, crossed swords for clashes, burst for attacks), stroked on a 24px grid. Weather warnings pick their pictogram from the warning text. On the map each pictogram sits in a 28px square badge filled with priority colour; unverified events get a dark badge with a dashed priority-colour edge. The same pictograms appear in the legend, layer list, queue rows, detail header and incoming tab. Live AIS ships are not alerts and use their own language: a small arrow pointing along the heading (a dot when stopped), coloured by six ship groups (cargo steel, tanker violet, passenger and leisure pink, fishing sea glass, service white, other dim grey) whose hues stay clear of the priority scale and of verified green; the key sits under the layer switch. A ship that is not under command, aground or sending a distress beacon gets a P1 red ring. Map paint colours are read from these tokens at load, never retyped in JavaScript.

## Components

### Buttons
Console keys: flat, square, uppercase signage.
- **Shape:** square corners (2px).
- **Default:** Panel 2 fill, Rule Strong 1px border, Saira 600 13px uppercase, 6px 12px padding.
- **Hover:** border turns Console Signal Blue, fill steps to Panel 3. **Focus:** 2px accent outline, 2px offset.
- **Primary:** Console Signal Blue fill with Signal Ink text.
- **On the rail:** fill mixed from Ink into Rail Blue, Rail Line border, Rail White text; hover border turns Rail White.
- **Disabled:** 45% opacity.

### Header rail with wall clocks
The rail is a solid Dispatch Rail Blue band with a Rail Line bottom rule. It holds the brand (a 10px square live dot, green and blinking in 2s steps when sources are live), two wall clocks (Madrid and UTC, with seconds), the source status in Azeret Mono at 12px clamped to two lines, and the action buttons. Each clock is a recessed box (Ink mixed into Rail, 1px Rail Line border) with a Saira caption above an Azeret Mono 16px time; on phones the caption sits beside the time.

### Dispatch queue row (signature)
One row per incident, a full-width button on a three-column grid: a 38px priority block, the text column, and the elapsed timer.
- **Priority block:** 26px tall, filled with the row's priority colour, P1 to P4 in Saira 700 14px Ink. Unverified: transparent fill, dashed border and text in priority colour.
- **Meta line:** category in Saira uppercase (Console White), source in muted 11px, then badges.
- **Title:** Public Sans 500, line-height 1.35, wraps anywhere.
- **Timer:** Azeret Mono 12px, `T+hh:mm`, then `T+Nd hh h` after two days; it keeps counting. Warnings that have not started show `Inicio hh:mm` (or a date) in muted 11px.
- **States:** hover fills Panel 2; selected fills Panel 3 with a 1px inset accent outline; historical rows mute title and timer.
- **Order:** current incidents newest first, then upcoming warnings by onset.

### Incoming-incident tab
A tab that hangs from the top edge of the map wall: Panel fill, no top border, 3px bottom bar in the incident's priority colour, Tab shadow. It shows a kind line ("Incidencia entrante · P2 · category · place") in Saira 11px uppercase tinted by priority, the title in Public Sans 600 13px, a count box in Azeret Mono when more than one is waiting, and a chevron. New arrivals drop in (0.45s, overshoot easing). Opening it unfolds a sheet below (grid-rows transition 0.3s) with a 3px priority top bar, a headline, the priority and category line, the trust seal, a definition list of details in mono, and actions. Under reduced motion the drop and the unfold are instant.

### Priority tally
A four-cell strip on Room ground, P1 to P4 left to right, cells divided by 1px rules: the code in Saira 700 11px tinted by priority, the count in Azeret Mono 20px, the Spanish level word in muted 11px.

### Chips and badges
- **Country chip:** square, accent-tinted fill (16% accent into Panel 2) with an accent-tinted border, Saira 600 12px uppercase, with a remove button.
- **Badges:** Saira 700 10px uppercase. "Sin verificar" is P2 orange on a 14% tint with a dashed border; verified is Official Green on a 16% tint; "Histórico" is muted on Panel 3.
- **Trust seal:** an inline SVG seal plus text: green "Fuente oficial" or "Noticia contrastada", orange "Sin contrastar · un solo medio".

### Inputs and switches
- **Search, selects:** Room well, Rule Strong border, 2px corners; focus is the global accent outline.
- **Layer switch:** a 30 by 16px square track on Room with a 10px square knob. On: accent-tinted track, accent border, knob slides 14px and turns accent. Mixed (group partly on): knob halfway.

### Touch
On coarse pointers every button, select, search field, layer item and group head is at least 44px tall; zoom buttons are 44px square; chip remove buttons 36px; queue rows at least 56px; the incoming tab at least 52px. Text fields go to 16px so iOS does not zoom.

## Do's and Don'ts

### Do:
- **Do** state severity as a priority code P1 (Crítica) to P4 (Baja) next to its colour, everywhere it appears.
- **Do** set the row, tab or marker's `--sev` from the priority scale and let the component colour itself from it.
- **Do** keep corners square (2px, or 0 for full-width sheets and blocks) and separate rows with 1px rules.
- **Do** set clocks, timers, counts and coordinates in Azeret Mono with tabular figures.
- **Do** mark unverified items with dashed outlines as well as P2 orange, so trust reads without colour.
- **Do** keep every control at 44px or more on coarse pointers, and text fields at 16px.
- **Do** honour reduced motion: no blink, pulse, drop or unfold animation.

### Don't:
- **Don't** build the generic dark dashboard: rounded cards with one neon accent.
- **Don't** use real police insignia, names or logos; the reference is the room, not the institution.
- **Don't** use green for anything except verified, official or live.
- **Don't** use priority red, orange or amber for decoration or emphasis.
- **Don't** put shadows on side-column panels; only overlays floating on the map wall cast them.
- **Don't** let severity rely on colour alone.
