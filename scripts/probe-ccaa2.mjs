// One-off probe: dumps the markup of regional pages that list emergencies, to write their parsers.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
async function get(u) {
  const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  return { status: r.status, url: r.url, body: await r.text() };
}
async function around(label, u, re, span = 3500, n = 1) {
  try {
    const p = await get(u);
    console.log(`\n===== ${label} ${p.status} ${p.url} ${p.body.length}B`);
    let i = 0, idx = p.body.search(re);
    while (idx >= 0 && i++ < n) { console.log(p.body.slice(Math.max(0, idx - 300), idx + span).replace(/\s+/g, " ")); const rest = p.body.slice(idx + span).search(re); idx = rest < 0 ? -1 : idx + span + rest; }
    const links = [...new Set([...p.body.matchAll(/href=["']([^"']*(?:rss|feed|\.xml|json|api)[^"']*)["']/gi)].map((m) => m[1]))].slice(0, 25);
    console.log("links:", links.join(" | "));
  } catch (e) { console.log(`\n===== ${label} ERROR ${e.message}`); }
}
await around("CLM 112", "https://112.castillalamancha.es/112", /Accidente|Incendio|views-row/i, 4000);
await around("CLM activas", "https://112.castillalamancha.es/112/emergencias-activas", /emergencia|views-row|Sin emergencias/i, 4000, 2);
await around("CLM incidente detalle", "https://112.castillalamancha.es/112/incidentes", /views-row|Accidente|Incendio/i, 3000);
await around("CLM notas emergencias RSS", "https://www.castillalamancha.es/notas-de-prensa/temas/emergencias-y-seguridad/rss.xml", /<item/i, 2500);
await around("Madrid seguridad", "https://www.comunidad.madrid/servicios/seguridad-emergencias", /rss/i, 400, 3);
