// Throwaway probe: Spanish weather warnings (Meteoalarm/AEMET) and OpenFreeMap vector tiles.
import { execSync } from "node:child_process";
execSync("npm i --no-save --no-audit --no-fund @mapbox/vector-tile@2.0.3 pbf@4.0.1", { stdio: "inherit" });
const { VectorTile } = await import("@mapbox/vector-tile");
const Pbf = (await import("pbf")).default;

async function show(url, n = 1500) {
  try { const r = await fetch(url, { headers: { "User-Agent": "WorldAlert/1.0" } }); const t = await r.text(); console.log("==", url, r.status, r.headers.get("content-type"), t.length); console.log(t.slice(0, n)); return t; }
  catch (e) { console.log("==", url, "ERR", e.message, e.cause?.code); }
}

const ma = await show("https://feeds.meteoalarm.org/api/v1/warnings/feeds-spain", 2500);
try {
  const j = JSON.parse(ma); const w = j.warnings || [];
  console.log("warnings", w.length);
  const a = w[0]?.alert; console.log(JSON.stringify(a, null, 1).slice(0, 3000));
  const withPoly = w.filter((x) => JSON.stringify(x).includes('"polygon"')).length; console.log("with polygon", withPoly);
} catch (e) { console.log("parse", e.message); }
await show("https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain", 1500);

const tj = await show("https://tiles.openfreemap.org/planet", 1200);
const tiles = JSON.parse(tj).tiles[0];
for (const [z, x, y] of [[6, 31, 24], [10, 502, 388], [13, 4017, 3103]]) { // Spain around Madrid
  const url = tiles.replace("{z}", z).replace("{x}", x).replace("{y}", y);
  const r = await fetch(url); const buf = Buffer.from(await r.arrayBuffer());
  console.log("== tile", z, x, y, r.status, buf.length, r.headers.get("content-encoding"));
  const vt = new VectorTile(new Pbf(buf));
  for (const name of Object.keys(vt.layers)) {
    const L = vt.layers[name]; const ex = [];
    for (let i = 0; i < Math.min(L.length, 400); i++) { const p = L.feature(i).properties; if (name === "place" || name === "boundary") ex.push(p); }
    console.log(" layer", name, L.length);
    if (name === "place") { const cls = {}; ex.forEach((p) => cls[p.class] = (cls[p.class] || 0) + 1); console.log("  classes", JSON.stringify(cls)); console.log("  sample", JSON.stringify(ex.slice(0, 3))); }
    if (name === "boundary") { const lv = {}; ex.forEach((p) => lv[p.admin_level] = (lv[p.admin_level] || 0) + 1); console.log("  levels", JSON.stringify(lv)); console.log("  sample", JSON.stringify(ex.slice(0, 2))); }
  }
}
const fr = await fetch("https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf"); console.log("font", fr.status, (await fr.arrayBuffer()).byteLength);
