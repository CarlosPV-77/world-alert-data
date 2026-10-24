// Throwaway probe: contents of AEMET's public GeoJSON warnings download.
import { gunzipSync } from "node:zlib";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
const page = await (await fetch("https://www.aemet.es/es/eltiempo/prediccion/avisos", { headers: UA })).text();
const links = [...new Set(page.match(/\/es\/geojson\/download\/avisos\/[^"]+/g) || [])];
console.log("links", links);
const plain = await fetch("https://www.aemet.es/es/eltiempo/prediccion/avisos", { headers: { "User-Agent": "WorldAlert/1.0" } }); console.log("plain UA page", plain.status);
const r = await fetch("https://www.aemet.es" + links[0], { headers: UA });
const gz = Buffer.from(await r.arrayBuffer()); console.log("tar.gz", r.status, r.headers.get("content-type"), gz.length);
const tar = gunzipSync(gz);
for (let o = 0; o + 512 <= tar.length;) {
  const name = tar.toString("utf8", o, o + 100).replace(/\0.*$/s, ""); if (!name) break;
  const size = parseInt(tar.toString("utf8", o + 124, o + 136).replace(/\0.*$/s, "").trim() || "0", 8);
  const body = tar.subarray(o + 512, o + 512 + size).toString("utf8");
  console.log("--", name, size);
  if (name.endsWith("json")) { try { const j = JSON.parse(body); console.log(" features", j.features?.length, "keys", Object.keys(j)); const f = j.features?.[0]; if (f) { console.log(" geom", f.geometry?.type, JSON.stringify(f.geometry?.coordinates)?.slice(0, 120)); console.log(" props", JSON.stringify(f.properties).slice(0, 1500)); } } catch (e) { console.log(" parse", e.message, body.slice(0, 300)); } }
  o += 512 + Math.ceil(size / 512) * 512;
}
// try the static "latest" names too
for (const p of ["/es/geojson/download/avisos", "/es/eltiempo/prediccion/avisos?w=hoy&datos=geojson"]) { const x = await fetch("https://www.aemet.es" + p, { headers: UA, redirect: "manual" }); console.log(p, x.status, x.headers.get("location"), x.headers.get("content-type")); }
