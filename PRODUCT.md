# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Carlos, the owner, is the only user for now. He follows world events out of curiosity and uses the map as his personal information hub for what is happening around the world. He uses it mostly on a desktop computer, and also wants it to work well on a phone and a tablet. Sharing with other people is not planned; treat it as possible later, not as a current requirement.

## Product Purpose

World Alert is a real-time world map that gathers in one place:

- natural disasters: earthquakes, volcanoes, tsunamis, cyclones, floods, wildfires and droughts;
- weather warnings, including AEMET warnings for Spain;
- maritime warnings;
- armed conflicts and attacks taken from the press.

Each event is shown at its real location.

Success means Carlos can open the map, turn on the topics and countries he cares about, and understand at a glance what is happening, how serious it is, and how trustworthy the information is.

## Positioning

It is a single personal hub that puts official hazard feeds and press-reported events on the same map. Every item is clearly marked as verified (an official source, or two or more outlets) or unverified (a single outlet). Spain is shown at maximum detail: villages, municipal and provincial limits, and AEMET warning zones.

## Operating Context

- The live site is https://world-alert-bridge.vercel.app. The code is in the public repo CarlosPV-77/world-alert-data, folder `site/` (a single `index.html` plus serverless `api/`).
- Data is fetched only while the page is open, and only for the layers that are turned on. Every layer starts off on each load, and Carlos turns on what he wants to see.
- Chosen countries focus the map and the list. New alerts in those countries arrive as a tab at the top of the map that unfolds with the details. Alerts can be saved.
- History and saved alerts are stored in the browser.

## Capabilities and Constraints

- Everything must stay free: free data sources, free hosting (Vercel Hobby), free map tiles (OpenFreeMap), and no paid keys.
- Interface language is Spanish (Spain).
- Disputed borders are shown as disputed.
- The severity scale has four levels: Baja, Media, Alta and Crítica.
- Undecided or pending: AIS ship tracking (needs a free key from Carlos) and piracy data (no free API found).

## Brand Commitments

The name is "World Alert". There is no logo or other brand asset yet.

## Evidence on Hand

All content is live data from public sources: USGS, GDACS, NOAA/NHC, NWS, NGA NAVAREA, AEMET and GDELT. There are no testimonials, users or press, and none must be invented.

## Product Principles

1. **The user decides what is on.** Nothing loads, refreshes or alerts unless he turned it on.
2. **Trust is always visible.** Verified and unverified information must never look the same.
3. **Severity first.** How serious an event is must read instantly, even without relying on color alone.
4. **Free and personal.** Never add something that needs payment, an account or a third-party key without asking.
5. **Spain in depth, the world at a glance.**
