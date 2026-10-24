// Throwaway probe: where to get Spanish warning zones and warnings without an API key.
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" };
async function grab(url) { try { const r = await fetch(url, { headers: UA }); const t = await r.text(); console.log("==", url, r.status, t.length); return t; } catch (e) { console.log("==", url, "ERR", e.message); return ""; } }
for (const br of ["main", "master"]) for (const f of ["aemet_alerts.R", "aemet_alert_zones.R"]) {
  const t = await grab(`https://raw.githubusercontent.com/rOpenSpain/climaemet/${br}/R/${f}`);
  if (t.length > 100) console.log(t.split("\n").filter((l) => /http|url|api|key|geojson|cap|tar|zip|GET|request/i.test(l)).slice(0, 40).join("\n"));
}
const page = await grab("https://www.aemet.es/es/eltiempo/prediccion/avisos");
console.log([...new Set(page.match(/(href|src|data-[a-z]+)="[^"]*(geojson|cap|tar|xml|json|rss|descarga|download)[^"]*"/gi) || [])].slice(0, 40).join("\n"));
const z = await fetch("https://www.aemet.es/documentos/es/eltiempo/prediccion/avisos/plan_meteoalerta/AEMET-meteoalerta-delimitacion-zonas.zip", { headers: UA });
const buf = Buffer.from(await z.arrayBuffer()); console.log("zones zip", z.status, buf.length);
// list zip entries from the central directory
let off = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); const n = buf.readUInt16LE(off + 10); let p = buf.readUInt32LE(off + 16);
for (let i = 0; i < n; i++) { const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32); console.log(" ", buf.toString("utf8", p + 46, p + 46 + nl), buf.readUInt32LE(p + 24)); p += 46 + nl + el + cl; }
