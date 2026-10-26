// One-off probe: raw samples of the Castilla y León 112 syndication and the Castilla-La Mancha plan feed.
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
async function show(label, u, from = 0, len = 5000) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    const b = await r.text();
    console.log(`\n===== ${label} ${r.status} ${r.headers.get("content-type")} ${b.length}B`);
    const i = typeof from === "number" ? from : Math.max(0, b.search(from));
    console.log(b.slice(i, i + len).replace(/\s+/g, " "));
    console.log("count items:", (b.match(/<item>/g) || []).length);
  } catch (e) { console.log(`\n===== ${label} ERROR ${e.message}`); }
}
await show("CyL sindicado", "https://112.jcyl.es/web/jcyl/112/es/PlantillaGeneracionContenidoIncidenteSindicadoComponente/1284178030391/_/1284739950810/Estructura", 0, 6000);
await show("CyL detalle", "https://112.jcyl.es/web/jcyl/112/es/Plantilla100Detalle/1284178030391/Incidente/1285693097216/Emergencia", /<h1|incidente|Fecha/i, 3000);
await show("CLM planes rss", "https://112.castillalamancha.es/rss.xml", /<item>/, 6000);
