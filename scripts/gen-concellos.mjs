// Builds site/api/_concellos.json: Galician municipality INE code -> [lat, lon], from Wikidata.
// MeteoGalicia names municipalities only by code, so its warnings need this to be placed on the map.
import { writeFileSync } from "node:fs";

const q = `SELECT ?ine ?lat ?lon WHERE {
  ?m wdt:P772 ?ine; p:P625/psv:P625 [ wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon ].
  FILTER(REGEX(STR(?ine), "^(15|27|32|36)"))
}`;
const r = await fetch("https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(q), { headers: { "User-Agent": "WorldAlert/1.0 (personal hazard map)", Accept: "application/sparql-results+json" } });
if (!r.ok) throw new Error(`Wikidata ${r.status}`);
const out = {};
for (const b of (await r.json()).results.bindings) {
  const code = b.ine.value.slice(0, 5);
  if (!out[code]) out[code] = [Math.round(+b.lat.value * 1000) / 1000, Math.round(+b.lon.value * 1000) / 1000];
}
const sorted = Object.fromEntries(Object.entries(out).sort());
writeFileSync(new URL("../site/api/_concellos.json", import.meta.url), JSON.stringify(sorted));
console.log(`${Object.keys(sorted).length} concellos`, Object.entries(sorted).slice(0, 5));
